import OTP from "../models/otp.model.js";
import OtpRepositoryContract from "../contracts/otp.repository.contract.js";

class OtpRepository extends OtpRepositoryContract {
    constructor(model = OTP) {
        super();
        this.model = model;
    }

    async create(data) {
        return this.model.create(data);
    }

    async findLatestUnusedWithHash(userId, purpose) {
        return this.model
            .findOne({ userId, purpose, used: false })
            .select("+otpHash expiresAt")
            .sort({ createdAt: -1 })
            .lean();
    }

    async findLatestUnusedForCustomerWithHash(customerId, purpose) {
        return this.model
            .findOne({ customerId, purpose, used: false })
            .select("+otpHash expiresAt")
            .sort({ createdAt: -1 })
            .lean();
    }

    async markPreviousAsUsed(userId, purpose) {
        const result = await this.model.updateMany(
            { userId, purpose, used: false },
            { $set: { used: true } }
        );
        return result.modifiedCount ?? 0;
    }

    async markPreviousForCustomerAsUsed(customerId, purpose) {
        const result = await this.model.updateMany(
            { customerId, purpose, used: false },
            { $set: { used: true } }
        );
        return result.modifiedCount ?? 0;
    }

    async markUsedById(otpId) {
        const result = await this.model.updateOne(
            { _id: otpId },
            { $set: { used: true } }
        );
        return result.modifiedCount ?? 0;
    }
}

export { OtpRepository };
export default new OtpRepository();
