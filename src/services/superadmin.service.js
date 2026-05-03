import bcrypt from "bcrypt";

import { ROLES } from "../constants/constants.js";
import businessRepository from "../repositories/business.repository.js";
import customerRepository from "../repositories/customer.repository.js";
import sessionRepository from "../repositories/session.repository.js";
import userRepository from "../repositories/user.repository.js";
import cacheService from "./cache.service.js";
import appError from "../utils/appError.js";

const PASSWORD_SALT_ROUNDS = 12;

const SUPERADMIN_CACHE_TTL = 30;
const SUPERADMIN_CACHE_KEYS = Object.freeze({
    stats: "superadmin:stats",
    businesses: "superadmin:businesses:v2",
});

class SuperAdminService {
    constructor({
        userRepo = userRepository,
        businessRepo = businessRepository,
        customerRepo = customerRepository,
        sessionRepo = sessionRepository,
        cache = cacheService,
    } = {}) {
        this.userRepo = userRepo;
        this.businessRepo = businessRepo;
        this.customerRepo = customerRepo;
        this.sessionRepo = sessionRepo;
        this.cache = cache;
    }

    async listBusinesses() {
        const businesses = await this.cache.wrap(
            SUPERADMIN_CACHE_KEYS.businesses,
            SUPERADMIN_CACHE_TTL,
            () => this.businessRepo.listAllWithOwnerAndAgentCount(ROLES.AGENT)
        );

        return {
            businesses: businesses.map((business) => ({
                ...business,
                ticketCount: 0,
            })),
            total: businesses.length,
        };
    }

    async getBusinessDetail(businessId) {
        const business = await this.businessRepo.findByIdWithOwner(businessId);
        if (!business) {
            throw appError("Business not found", 404);
        }

        const [agents, totalCustomers] = await Promise.all([
            this.userRepo.listByBusinessAndRole(businessId, ROLES.AGENT),
            this.customerRepo.count({ businessId }),
        ]);

        if (business.ownerId) {
            business.owner = business.ownerId;
            delete business.ownerId;
        }

        return {
            business,
            agents,
            counts: {
                totalAgents: agents.length,
                totalCustomers,
                totalTickets: 0,
                openTickets: 0,
                resolvedTickets: 0,
                kbEntries: 0,
                aiHandledRate: "0%",
            },
        };
    }

    async updateBusinessStatus(businessId, { isActive, reason = "" }) {
        const updated = await this.businessRepo.updateStatus(businessId, { isActive, reason });

        if (!updated) {
            throw appError("Business not found", 404);
        }

        if (!updated.isActive) {
            await this.userRepo.deactivateByBusinessAndRoles(
                businessId,
                [ROLES.AGENT, ROLES.ADMIN]
            );
        }

        await this.cache.delMany([
            SUPERADMIN_CACHE_KEYS.stats,
            SUPERADMIN_CACHE_KEYS.businesses,
        ]);

        return {
            _id: updated._id,
            name: updated.name,
            isActive: updated.isActive,
            suspensionReason: updated.suspensionReason,
        };
    }

    async toggleBusiness(businessId) {
        const existing = await this.businessRepo.findById(businessId);
        if (!existing) {
            throw appError("Business not found", 404);
        }

        return this.updateBusinessStatus(businessId, { isActive: !existing.isActive });
    }

    async updateBusinessPlan(businessId, { plan }) {
        const updated = await this.businessRepo.updatePlan(businessId, plan);
        if (!updated) {
            throw appError("Business not found", 404);
        }

        await this.cache.delMany([
            SUPERADMIN_CACHE_KEYS.stats,
            SUPERADMIN_CACHE_KEYS.businesses,
        ]);

        return {
            _id: updated._id,
            name: updated.name,
            plan: updated.plan,
        };
    }

    async listUsers({ page, limit, role, businessId }) {
        const filter = {};
        if (role) filter.role = role;
        if (businessId) filter.businessId = businessId;

        return this.userRepo.paginate({ filter, page, limit });
    }

    async updateUserRole(userId, { role, businessId = null }) {
        if (!Object.values(ROLES).includes(role)) {
            throw appError("Invalid role", 400);
        }

        const updates = { role };
        if (role === ROLES.SUPERADMIN) {
            updates.businessId = null;
        } else if (businessId) {
            updates.businessId = businessId;
        }

        const user = await this.userRepo.updateById(userId, updates);
        if (!user) {
            throw appError("User not found", 404);
        }

        await this.sessionRepo.deleteAllForUser(user._id);
        return user;
    }

    async stats() {
        return this.cache.wrap(
            SUPERADMIN_CACHE_KEYS.stats,
            SUPERADMIN_CACHE_TTL,
            async () => {
                const [businessCounts, userCounts, totalCustomers] = await Promise.all([
                    this.businessRepo.statsCounts(),
                    this.userRepo.statsByRoles([ROLES.AGENT]),
                    this.customerRepo.count({}),
                ]);

                return {
                    totalBusinesses: businessCounts.total,
                    activeBusinesses: businessCounts.active,
                    totalAgents: userCounts.byRole[ROLES.AGENT] ?? 0,
                    totalCustomers,
                    totalUsers: userCounts.total,
                };
            }
        );
    }

    async bootstrapSuperAdmin({ name, email, password }) {
        const existingSuperAdmin = await this.userRepo.findOneByRole(ROLES.SUPERADMIN);
        if (existingSuperAdmin) {
            return {
                alreadyExists: true,
                message: "Super admin already exists",
                email: existingSuperAdmin.email,
            };
        }

        const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
        const superAdmin = await this.userRepo.create({
            name,
            email: email.toLowerCase(),
            passwordHash,
            role: ROLES.SUPERADMIN,
            authProviders: ["password"],
            isEmailVerified: true,
            isActive: true,
        });

        return {
            alreadyExists: false,
            message: "Super admin created successfully",
            superAdmin: {
                name: superAdmin.name,
                email: superAdmin.email,
                role: superAdmin.role,
            },
        };
    }
}

const superAdminService = new SuperAdminService();
export default superAdminService;
export { SuperAdminService };
