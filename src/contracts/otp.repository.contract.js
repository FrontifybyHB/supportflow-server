/**
 * @abstract
 * Contract for OTP repository.
 * Defines every database operation the OTP feature needs.
 */
class OtpRepositoryContract {
    /**
     * @param {Object} data
     * @param {string} [data.userId]
     * @param {string} [data.customerId]
     * @param {string} [data.businessId]
     * @param {string} data.otpHash
     * @param {string} data.purpose
     * @param {Date} data.expiresAt
     * @returns {Promise<Object>}
     */
    async create(_data) {
        void _data;
        throw new Error("Method not implemented: create");
    }

    /**
     * Returns the latest unused OTP for a user/purpose, including the hashed value.
     * @param {string} userId
     * @param {string} purpose
     * @returns {Promise<Object|null>}
     */
    async findLatestUnusedWithHash(_userId, _purpose) {
        void _userId; void _purpose;
        throw new Error("Method not implemented: findLatestUnusedWithHash");
    }

    /**
     * Returns the latest unused OTP for a customer/purpose, including the hashed value.
     * @param {string} customerId
     * @param {string} purpose
     * @returns {Promise<Object|null>}
     */
    async findLatestUnusedForCustomerWithHash(_customerId, _purpose) {
        void _customerId; void _purpose;
        throw new Error("Method not implemented: findLatestUnusedForCustomerWithHash");
    }

    /**
     * Marks every previous unused OTP for the same user/purpose as used.
     * @param {string} userId
     * @param {string} purpose
     * @returns {Promise<number>}
     */
    async markPreviousAsUsed(_userId, _purpose) {
        void _userId; void _purpose;
        throw new Error("Method not implemented: markPreviousAsUsed");
    }

    /**
     * Marks every previous unused OTP for the same customer/purpose as used.
     * @param {string} customerId
     * @param {string} purpose
     * @returns {Promise<number>}
     */
    async markPreviousForCustomerAsUsed(_customerId, _purpose) {
        void _customerId; void _purpose;
        throw new Error("Method not implemented: markPreviousForCustomerAsUsed");
    }

    /**
     * @param {string} otpId
     * @returns {Promise<Object|null>}
     */
    async markUsedById(_otpId) {
        void _otpId;
        throw new Error("Method not implemented: markUsedById");
    }
}

export default OtpRepositoryContract;
