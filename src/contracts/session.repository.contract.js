/**
 * @abstract
 * Contract for Session repository.
 * Refresh-token sessions are stored hashed; queries are scoped by userId + sessionId.
 */
class SessionRepositoryContract {
    /**
     * @param {Object} data
     * @param {string} data.userId
     * @param {string} data.sessionId
     * @param {string} data.refreshTokenHash
     * @param {string} [data.userAgent]
     * @param {string} [data.ipAddress]
     * @param {Date} data.expiresAt
     * @returns {Promise<Object>}
     */
    async create(_data) {
        void _data;
        throw new Error("Method not implemented: create");
    }

    /**
     * Returns the session document including the refresh-token hash.
     * @param {string} userId
     * @param {string} sessionId
     * @returns {Promise<Object|null>}
     */
    async findByUserAndSessionWithHash(_userId, _sessionId) {
        void _userId; void _sessionId;
        throw new Error("Method not implemented: findByUserAndSessionWithHash");
    }

    /**
     * @param {string} sessionDocId
     * @returns {Promise<{deletedCount:number}>}
     */
    async deleteById(_sessionDocId) {
        void _sessionDocId;
        throw new Error("Method not implemented: deleteById");
    }

    /**
     * @param {string} userId
     * @param {string} sessionId
     * @returns {Promise<{deletedCount:number}>}
     */
    async deleteByUserAndSession(_userId, _sessionId) {
        void _userId; void _sessionId;
        throw new Error("Method not implemented: deleteByUserAndSession");
    }

    /**
     * @param {string} userId
     * @returns {Promise<{deletedCount:number}>}
     */
    async deleteAllForUser(_userId) {
        void _userId;
        throw new Error("Method not implemented: deleteAllForUser");
    }
}

export default SessionRepositoryContract;
