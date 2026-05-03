import agentService from "../services/agent.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import { success } from "../utils/response.js";

class AgentController {
    constructor(service = agentService) {
        this.agentService = service;
    }

    createAgent = asyncHandler(async (req, res) => {
        const agent = await this.agentService.createAgent(req.body, req.businessId);
        return success(res, { agent }, 201);
    });

    listAgents = asyncHandler(async (req, res) => {
        const result = await this.agentService.listAgents(req.businessId, req.query);
        return success(res, {
            agents: result.data,
            total: result.total,
            page: result.page,
            totalPages: result.totalPages,
        });
    });

    updateAgent = asyncHandler(async (req, res) => {
        const agent = await this.agentService.updateAgent(
            req.params.id,
            req.businessId,
            { isActive: req.body.isActive }
        );
        return success(res, { agent });
    });
}

const agentController = new AgentController();
export default agentController;
