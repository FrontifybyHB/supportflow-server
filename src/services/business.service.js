import businessRepository from "../repositories/business.repository.js";
import customerRepository from "../repositories/customer.repository.js";
import userRepository from "../repositories/user.repository.js";
import userService from "./user.service.js";
import { ROLES } from "../constants/constants.js";
import appError from "../utils/appError.js";

class BusinessService {
    constructor({
        businessRepo = businessRepository,
        customerRepo = customerRepository,
        userRepo = userRepository,
        userSvc = userService,
    } = {}) {
        this.businessRepo = businessRepo;
        this.customerRepo = customerRepo;
        this.userRepo = userRepo;
        this.userService = userSvc;
    }

    async createBusinessForUser(userId, payload) {
        const user = await this.userService.createBusinessForUser(userId, payload);
        const business = await this.businessRepo.findById(user.businessId);

        return {
            business,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                businessId: user.businessId,
            },
        };
    }

    async getBusinessById(businessId) {
        const business = await this.businessRepo.findByIdWithOwner(businessId);
        if (!business) {
            throw appError("Business not found", 404);
        }
        if (business.ownerId) {
            business.owner = business.ownerId;
            delete business.ownerId;
        }
        return business;
    }

    async listPublicBusinesses() {
        const businesses = await this.businessRepo.listPublicActive();

        return {
            businesses: businesses.map((business) => ({
                _id: business._id,
                businessId: business._id,
                name: business.name,
                industry: business.industry || "",
                category: business.industry || "",
                description: business.description || "",
                chatWidgetEnabled: business.settings?.chatWidgetEnabled !== false,
                isActive: true,
                createdAt: business.createdAt,
            })),
            total: businesses.length,
        };
    }

    async updateBusiness(businessId, updates) {
        const allowed = {};
        for (const field of ["name", "industry", "description", "settings", "knowledgeBase"]) {
            if (updates[field] !== undefined) allowed[field] = updates[field];
        }

        const business = await this.businessRepo.updateById(businessId, allowed);
        if (!business) {
            throw appError("Business not found", 404);
        }

        return business;
    }

    async getStats(businessId) {
        const [totalAgents, totalCustomers] = await Promise.all([
            this.userRepo.count({ businessId, role: ROLES.AGENT }),
            this.customerRepo.count({ businessId }),
        ]);

        return {
            totalAgents,
            totalTickets: 0,
            openTickets: 0,
            resolvedTickets: 0,
            totalCustomers,
            aiHandledRate: "0%",
        };
    }
}

const businessService = new BusinessService();
export default businessService;
export { BusinessService };
