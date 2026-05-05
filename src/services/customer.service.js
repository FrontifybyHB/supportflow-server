import bcrypt from "bcrypt";

import { OTP_PURPOSES } from "../constants/constants.js";
import businessRepository from "../repositories/business.repository.js";
import customerRepository from "../repositories/customer.repository.js";
import otpRepository from "../repositories/otp.repository.js";
import { enqueueOtpEmail } from "../queues/email.queue.js";
import appError from "../utils/appError.js";
import config from "../config/config.js";
import { generateOtp, getOtpExpiresAt } from "../utils/otp.js";
import { generateCustomerToken } from "../utils/tokens.js";

const TOKEN_HASH_ROUNDS = 10;
const normalizeEmail = (email) => email?.trim().toLowerCase();
const includeDeliveryDebug = () => config.NODE_ENV !== "production";
const pickFirst = (...values) => values.find((value) => value !== undefined && value !== null);

const normalizeCustomerPayload = (payload = {}) => ({
    businessId: payload.businessId,
    name: pickFirst(payload.name, payload.customerName, payload.userName),
    email: pickFirst(payload.email, payload.customerEmail),
    phone: pickFirst(payload.phone, payload.phoneNumber, payload.customerPhone),
    otp: pickFirst(payload.otp, payload.code),
});

const summarizeOtpDelivery = (delivery) => {
    if (!delivery) return { status: "unknown" };
    if (delivery.error) return { status: "failed", error: delivery.error };
    if (delivery.queued) return { status: "queued", jobId: delivery.jobId };
    if (delivery.pending) {
        return {
            status: "pending",
            fallback: delivery.fallback,
            reason: delivery.reason,
        };
    }
    if (delivery.email?.skipped) return { status: "skipped", reason: "smtp_not_configured" };
    if (delivery.email?.rejected?.length) {
        return { status: "rejected", rejected: delivery.email.rejected };
    }
    if (delivery.email?.messageId || delivery.email?.accepted?.length) {
        return {
            status: "sent",
            messageId: delivery.email.messageId,
            accepted: delivery.email.accepted,
        };
    }
    return { status: "unknown" };
};

class CustomerService {
    constructor({
        businessRepo = businessRepository,
        customerRepo = customerRepository,
        otpRepo = otpRepository,
    } = {}) {
        this.businessRepo = businessRepo;
        this.customerRepo = customerRepo;
        this.otpRepo = otpRepo;
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
            isEmailVerified: customer.isEmailVerified,
        });

        return {
            customerToken,
            customerId: customer._id,
            name: customer.name,
        };
    }

    async requestEmailVerification(payload) {
        const { businessId, name, email, phone } = normalizeCustomerPayload(payload);
        const business = await this.businessRepo.findActiveById(businessId);
        if (!business) {
            throw appError("Business not found or inactive", 404);
        }

        const normalizedEmail = normalizeEmail(email);
        const customer = await this.customerRepo.upsertByBusinessAndEmail({
            businessId: business._id,
            email: normalizedEmail,
            name,
            phone,
        });
        const delivery = await this.createAndQueueCustomerOtp(
            customer,
            business._id,
            OTP_PURPOSES.CUSTOMER_EMAIL_VERIFICATION
        );

        return {
            customerId: customer._id,
            businessId: business._id,
            email: customer.email,
            message: "Verification OTP queued",
            ...(includeDeliveryDebug() && { otpDelivery: summarizeOtpDelivery(delivery) }),
        };
    }

    async verifyEmailOtp(payload) {
        const { businessId, email, otp } = normalizeCustomerPayload(payload);
        const normalizedEmail = normalizeEmail(email);
        const customer = await this.customerRepo.findByBusinessAndEmail(
            businessId,
            normalizedEmail
        );

        if (!customer) {
            throw appError("Customer not found for this business", 404);
        }

        const otpDoc = await this.otpRepo.findLatestUnusedForCustomerWithHash(
            customer._id,
            OTP_PURPOSES.CUSTOMER_EMAIL_VERIFICATION
        );

        if (!otpDoc || otpDoc.expiresAt < new Date()) {
            throw appError("OTP expired or not found", 400);
        }

        const otpMatches = await bcrypt.compare(otp, otpDoc.otpHash);
        if (!otpMatches) {
            throw appError("Invalid OTP", 400);
        }

        await this.otpRepo.markUsedById(otpDoc._id);
        const verifiedCustomer = await this.customerRepo.markEmailVerified(customer._id);
        const customerToken = generateCustomerToken({
            customerId: verifiedCustomer._id,
            businessId: verifiedCustomer.businessId,
            email: verifiedCustomer.email,
            isEmailVerified: verifiedCustomer.isEmailVerified,
        });

        return {
            customerToken,
            customerId: verifiedCustomer._id,
            businessId: verifiedCustomer.businessId,
            name: verifiedCustomer.name,
            email: verifiedCustomer.email,
            isEmailVerified: verifiedCustomer.isEmailVerified,
            message: "Customer email verified successfully",
        };
    }

    async createAndQueueCustomerOtp(customer, businessId, purpose) {
        await this.otpRepo.markPreviousForCustomerAsUsed(customer._id, purpose);

        const otp = generateOtp();
        const otpHash = await bcrypt.hash(otp, TOKEN_HASH_ROUNDS);

        await this.otpRepo.create({
            customerId: customer._id,
            businessId,
            otpHash,
            purpose,
            expiresAt: getOtpExpiresAt(),
        });

        return enqueueOtpEmail({
            to: customer.email,
            otp,
            purpose,
        });
    }
}

const customerService = new CustomerService();
export default customerService;
export { CustomerService };
