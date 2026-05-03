import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import agentService from "../services/agent.service.js";
import ticketService from "../services/ticket.service.js";

class AgentController {
  constructor({ tickets = ticketService, agents = agentService } = {}) {
    this.ticketService = tickets;
    this.agentService = agents;
  }

  getMe = asyncHandler(async (req, res) => {
    res.status(200).json(ApiResponse.success(req.user, "Agent fetched"));
  });

  createAgent = asyncHandler(async (req, res) => {
    const agent = await this.agentService.createAgent(req.body, req.businessId);
    res.status(201).json(ApiResponse.success({ agent }, "Agent created", 201));
  });

  listAgents = asyncHandler(async (req, res) => {
    const result = await this.agentService.listAgents(req.businessId, req.query);
    res.status(200).json(ApiResponse.success({
      agents: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    }, "Agents fetched"));
  });

  updateAgent = asyncHandler(async (req, res) => {
    const agent = await this.agentService.updateAgent(
      req.params.id,
      req.businessId,
      { isActive: req.body.isActive }
    );
    res.status(200).json(ApiResponse.success({ agent }, "Agent updated"));
  });

  listTickets = asyncHandler(async (req, res) => {
    const data = await this.ticketService.listAgentTickets(req.user, req.query);
    res.status(200).json(ApiResponse.success(data, "Tickets fetched"));
  });

  getTicket = asyncHandler(async (req, res) => {
    const data = await this.ticketService.getTicket(req.user, req.params.id);
    res.status(200).json(ApiResponse.success(data, "Ticket fetched"));
  });

  updateStatus = asyncHandler(async (req, res) => {
    const data = await this.ticketService.updateStatus(
      req.user,
      req.params.id,
      req.body.status,
      req.app.get("io")
    );
    res.status(200).json(ApiResponse.success(data, "Ticket status updated"));
  });

  assignTicket = asyncHandler(async (req, res) => {
    const data = await this.ticketService.assignAgent(
      req.user,
      req.params.id,
      req.body.agentId,
      req.app.get("io")
    );
    res.status(200).json(ApiResponse.success(data, "Ticket assigned"));
  });

  addMessage = asyncHandler(async (req, res) => {
    const data = await this.ticketService.addAgentMessage(
      req.user,
      req.params.id,
      req.body.content,
      req.app.get("io")
    );
    res.status(201).json(ApiResponse.success(data, "Message added", 201));
  });
}

const agentController = new AgentController();
export default agentController;
