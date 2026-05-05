import businessRepository from "../repositories/business.repository.js";
import customerRepository from "../repositories/customer.repository.js";
import appError from "../utils/appError.js";
import { generateCustomerToken } from "../utils/tokens.js";

const pickFirst = (...values) => values.find((value) => value !== undefined && value !== null);

const normalizeCustomerPayload = (payload = {}) => ({
    businessId: payload.businessId,
    name: pickFirst(payload.name, payload.customerName, payload.userName),
    email: pickFirst(payload.email, payload.customerEmail),
    phone: pickFirst(payload.phone, payload.phoneNumber, payload.customerPhone),
});

class CustomerService {
    constructor({
        businessRepo = businessRepository,
        customerRepo = customerRepository,
    } = {}) {
        this.businessRepo = businessRepo;
        this.customerRepo = customerRepo;
    }

    async identify(payload) {
        const { businessId, name, email, phone } = normalizeCustomerPayload(payload);
        const business = await this.businessRepo.findActiveById(businessId);
        if (!business) {
            throw appError("Business not found or inactive", 404);
        }

        const normalizedEmail = email?.toLowerCase() || null;
        const customer = normalizedEmail
            ? await this.customerRepo.upsertByBusinessAndEmail({
                businessId: business._id,
                email: normalizedEmail,
                name,
                phone,
            })
            : await this.customerRepo.create({
                businessId: business._id,
                name: name || "Guest",
                email: null,
                phone: phone || null,
            });

        const customerToken = generateCustomerToken({
            customerId: customer._id,
            businessId: business._id,
            email: customer.email,
        });

        return {
            customerToken,
            customerId: customer._id,
            name: customer.name,
        };
    }
}

const customerService = new CustomerService();
export default customerService;
export { CustomerService };
