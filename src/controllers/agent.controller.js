import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import ticketService from "../services/ticket.service.js";

class AgentController {
  constructor(service = ticketService) {
    this.ticketService = service;
  }

  getMe = asyncHandler(async (req, res) => {
    res.status(200).json(ApiResponse.success(req.user, "Agent fetched"));
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
