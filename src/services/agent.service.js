import bcrypt from "bcrypt";

import { AUTH_PROVIDERS, ROLES } from "../constants/constants.js";
import userRepository from "../repositories/user.repository.js";
import appError from "../utils/appError.js";

const PASSWORD_SALT_ROUNDS = 12;

const toAgentResponse = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    businessId: user.businessId,
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
});

class AgentService {
    constructor({ userRepo = userRepository } = {}) {
        this.userRepo = userRepo;
    }

    async createAgent({ name, email, password }, businessId) {
        const normalizedEmail = email.toLowerCase();
        const existing = await this.userRepo.findByEmailWithPassword(normalizedEmail);

        if (existing?.businessId && existing.businessId.toString() !== businessId.toString()) {
            throw appError("User already belongs to another business", 409);
        }

        if (existing?.role === ROLES.SUPERADMIN) {
            throw appError("Cannot assign a superadmin as an agent", 400);
        }

        if (existing) {
            const setFields = {
                name: name || existing.name,
                businessId,
                role: ROLES.AGENT,
                isActive: true,
                isEmailVerified: true,
            };

            const update = { $set: setFields };
            if (!existing.passwordHash && password) {
                setFields.passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
                update.$addToSet = { authProviders: AUTH_PROVIDERS.PASSWORD };
            }

            const updated = await this.userRepo.updateById(existing._id, update);
            return toAgentResponse(updated);
        }

        const created = await this.userRepo.create({
            name,
            email: normalizedEmail,
            passwordHash: await bcrypt.hash(password, PASSWORD_SALT_ROUNDS),
            role: ROLES.AGENT,
            businessId,
            isActive: true,
            isEmailVerified: true,
            authProviders: [AUTH_PROVIDERS.PASSWORD],
        });

        return toAgentResponse(created);
    }

    async listAgents(businessId, query = {}) {
        let isActive;
        if (query.isActive !== undefined) {
            isActive = query.isActive === true || query.isActive === "true";
        }

        return this.userRepo.paginateByBusinessAndRole({
            businessId,
            role: ROLES.AGENT,
            isActive,
            page: query.page,
            limit: query.limit,
        });
    }

    async updateAgent(agentId, businessId, updates) {
        const agent = await this.userRepo.updateScopedByRole(
            agentId,
            businessId,
            ROLES.AGENT,
            updates
        );

        if (!agent) {
            throw appError("Agent not found", 404);
        }

        return agent;
    }
}

const agentService = new AgentService();
export default agentService;
export { AgentService };
