/**
 * @abstract
 * Contract for OTP repository.
 * Defines every database operation the OTP feature needs.
 */
class OtpRepositoryContract {
    /**
     * @param {Object} data
     * @param {string} data.userId
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
     * @param {string} otpId
     * @returns {Promise<Object|null>}
     */
    async markUsedById(_otpId) {
        void _otpId;
        throw new Error("Method not implemented: markUsedById");
    }
}

export default OtpRepositoryContract;
