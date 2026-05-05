import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ROLES } from "../src/constants/constants.js";
import { AgentService } from "../src/services/agent.service.js";

const createOtpRepo = () => ({
    marked: [],
    created: [],
    async markPreviousAsUsed(userId, purpose) {
        this.marked.push({ userId, purpose });
    },
    async create(data) {
        this.created.push(data);
        return data;
    },
});

describe("AgentService", () => {
    it("creates a new agent as pending verification and queues an OTP", async () => {
        const otpRepo = createOtpRepo();
        const queuedEmails = [];
        const userRepo = {
            async findByEmailWithPassword() {
                return null;
            },
            async create(data) {
                return { _id: "agent-1", ...data };
            },
        };

        const service = new AgentService({
            userRepo,
            otpRepo,
            enqueueOtp: async (payload) => {
                queuedEmails.push(payload);
                return { queued: true };
            },
        });

        const agent = await service.createAgent(
            { name: "Support Agent", email: "AGENT@EXAMPLE.COM", password: "Password1" },
            "business-1"
        );

        assert.equal(agent.role, ROLES.AGENT);
        assert.equal(agent.email, "agent@example.com");
        assert.equal(agent.businessId, "business-1");
        assert.equal(agent.isEmailVerified, false);
        assert.equal(otpRepo.marked.length, 1);
        assert.equal(otpRepo.created.length, 1);
        assert.equal(queuedEmails.length, 1);
        assert.equal(queuedEmails[0].to, "agent@example.com");
    });

    it("converts an existing same-tenant user to a pending agent and queues an OTP", async () => {
        const otpRepo = createOtpRepo();
        const updates = [];
        const existingUser = {
            _id: "user-1",
            name: "Existing User",
            email: "user@example.com",
            role: ROLES.CUSTOMER,
            businessId: null,
            passwordHash: "hashed-password",
            isActive: true,
            isEmailVerified: true,
        };
        const userRepo = {
            async findByEmailWithPassword() {
                return existingUser;
            },
            async updateById(userId, update) {
                updates.push({ userId, update });
                return {
                    ...existingUser,
                    ...update.$set,
                };
            },
        };

        const service = new AgentService({
            userRepo,
            otpRepo,
            enqueueOtp: async () => ({ queued: true }),
        });

        const agent = await service.createAgent(
            { name: "Renamed Agent", email: "user@example.com", password: "Password1" },
            "business-1"
        );

        assert.equal(updates.length, 1);
        assert.equal(updates[0].update.$set.role, ROLES.AGENT);
        assert.equal(updates[0].update.$set.isEmailVerified, false);
        assert.equal(agent.role, ROLES.AGENT);
        assert.equal(agent.isEmailVerified, false);
        assert.equal(otpRepo.created.length, 1);
    });
});
