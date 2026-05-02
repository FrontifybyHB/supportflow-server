import User from "../models/user.model.js";
import appError from "../utils/appError.js";
import logger from "../loggers/winston.logger.js";
import TicketRepository from "../repositories/ticket.repository.js";
import MessageRepository from "../repositories/message.repository.js";
import BusinessRepository from "../repositories/business.repository.js";

class TicketService {
  constructor(
    ticketRepository = new TicketRepository(),
    messageRepository = new MessageRepository(),
    businessRepository = new BusinessRepository()
  ) {
    this.ticketRepository = ticketRepository;
    this.messageRepository = messageRepository;
    this.businessRepository = businessRepository;
  }

  async createCustomerTicket(data, io) {
    const business = await this.businessRepository.findById(data.businessId);
    if (!business || !business.isActive) {
      throw appError("Business not found or inactive", 404);
    }

    const ticket = await this.ticketRepository.create({
      businessId: data.businessId,
      customer: {
        name: data.customerName || "Guest",
        email: data.customerEmail || "",
      },
      subject: data.subject || this.buildSubject(data.message),
      priority: data.priority || "medium",
      source: "chat",
    });

    const message = await this.messageRepository.create({
      ticketId: ticket._id,
      businessId: ticket.businessId,
      senderType: "customer",
      content: data.message,
    });

    io?.to(String(ticket.businessId)).emit("ticket_created", ticket);
    io?.to(String(ticket._id)).emit("new_message", message);

    logger.info(`Ticket created: ${ticket._id}`);
    return { ticket, message };
  }

  async createAiResolvedTicket(data, aiReply, io) {
    const business = await this.businessRepository.findById(data.businessId);
    if (!business || !business.isActive) {
      throw appError("Business not found or inactive", 404);
    }

    const ticket = await this.ticketRepository.create({
      businessId: data.businessId,
      customer: {
        name: data.customerName || "Guest",
        email: data.customerEmail || "",
      },
      subject: data.subject || this.buildSubject(data.message),
      priority: data.priority || "medium",
      status: "resolved",
      source: "chat",
    });

    const customerMessage = await this.messageRepository.create({
      ticketId: ticket._id,
      businessId: ticket.businessId,
      senderType: "customer",
      content: data.message,
    });

    const assistantMessage = await this.messageRepository.create({
      ticketId: ticket._id,
      businessId: ticket.businessId,
      senderType: "ai",
      content: aiReply,
    });

    io?.to(String(ticket.businessId)).emit("ticket_created", ticket);
    io?.to(String(ticket._id)).emit("new_message", customerMessage);
    io?.to(String(ticket._id)).emit("new_message", assistantMessage);

    logger.info(`AI-resolved ticket created: ${ticket._id}`);
    return { ticket, messages: [customerMessage, assistantMessage] };
  }

  async listAgentTickets(user, query = {}) {
    return this.ticketRepository.findAll({
      businessId: user.businessId,
      status: query.status,
      priority: query.priority,
      assignedAgent: user.role === "agent" ? user._id : undefined,
      includeUnassigned: user.role === "agent",
      page: query.page,
      limit: query.limit,
      allowCrossTenant: user.role === "superadmin",
    });
  }

  async getTicket(user, ticketId) {
    const ticket = await this.ticketRepository.findById(
      ticketId,
      user.businessId,
      { allowCrossTenant: user.role === "superadmin" }
    );
    if (!ticket) throw appError("Ticket not found", 404);
    this.ensureTicketAccess(user, ticket);

    const messages = await this.messageRepository.findByTicketId(
      ticketId,
      ticket.businessId
    );
    return { ticket, messages };
  }

  async updateStatus(user, ticketId, status, io) {
    const existingTicket = await this.ticketRepository.findById(
      ticketId,
      user.businessId,
      { allowCrossTenant: user.role === "superadmin" }
    );
    if (!existingTicket) throw appError("Ticket not found", 404);
    this.ensureTicketAccess(user, existingTicket);

    const ticket = await this.ticketRepository.updateStatus(
      ticketId,
      existingTicket.businessId,
      status,
      { allowCrossTenant: user.role === "superadmin" }
    );
    io?.to(String(ticket.businessId)).emit("ticket_updated", ticket);
    io?.to(String(ticket._id)).emit("ticket_updated", ticket);

    logger.info(`Ticket status updated: ${ticketId} -> ${status}`);
    return ticket;
  }

  async assignAgent(user, ticketId, agentId, io) {
    if (!["admin", "superadmin"].includes(user.role)) {
      throw appError("Only admins can assign tickets", 403);
    }

    const existingTicket = await this.ticketRepository.findById(
      ticketId,
      user.businessId,
      { allowCrossTenant: user.role === "superadmin" }
    );
    if (!existingTicket) throw appError("Ticket not found", 404);
    this.ensureTicketAccess(user, existingTicket);

    const agent = await User.findById(agentId)
      .select("+role businessId isActive")
      .lean();
    if (!agent || agent.role !== "agent" || !agent.isActive) {
      throw appError("Active agent not found", 404);
    }

    if (String(agent.businessId) !== String(existingTicket.businessId)) {
      throw appError("Agent does not belong to your business", 403);
    }

    const ticket = await this.ticketRepository.assignAgent(
      ticketId,
      existingTicket.businessId,
      agentId,
      { allowCrossTenant: user.role === "superadmin" }
    );
    io?.to(String(ticket.businessId)).emit("ticket_updated", ticket);
    io?.to(String(ticket._id)).emit("ticket_updated", ticket);

    logger.info(`Ticket assigned: ${ticketId} -> ${agentId}`);
    return ticket;
  }

  async addAgentMessage(user, ticketId, content, io) {
    const ticket = await this.ticketRepository.findById(
      ticketId,
      user.businessId,
      { allowCrossTenant: user.role === "superadmin" }
    );
    if (!ticket) throw appError("Ticket not found", 404);
    this.ensureTicketAccess(user, ticket);

    const message = await this.messageRepository.create({
      ticketId: ticket._id,
      businessId: ticket.businessId,
      senderType: "agent",
      senderId: user._id,
      content,
    });

    io?.to(String(ticket.businessId)).emit("new_message", message);
    io?.to(String(ticket._id)).emit("new_message", message);

    logger.info(`Agent message added to ticket: ${ticketId}`);
    return message;
  }

  ensureTicketAccess(user, ticket) {
    if (user.role === "superadmin") return;

    if (String(ticket.businessId) !== String(user.businessId)) {
      throw appError("You do not have access to this ticket", 403);
    }

    if (
      user.role === "agent" &&
      ticket.assignedAgent &&
      String(ticket.assignedAgent) !== String(user._id)
    ) {
      throw appError("This ticket is assigned to another agent", 403);
    }
  }

  buildSubject(message = "") {
    const trimmed = message.trim();
    if (!trimmed) return "New support request";
    return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
  }
}

const ticketService = new TicketService();
export default ticketService;
