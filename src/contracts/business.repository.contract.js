/**
 * @abstract
 * Contract for Business repository.
 * Business documents represent the tenant itself, so methods accept _id rather than businessId.
 */
class BusinessRepositoryContract {
    /**
     * @param {Object} data
     * @returns {Promise<Object>}
     */
    async create(_data) {
        void _data;
        throw new Error("Method not implemented: create");
    }

    /**
     * @param {string} id
     * @returns {Promise<Object|null>}
     */
    async findById(_id) {
        void _id;
        throw new Error("Method not implemented: findById");
    }

    /**
     * @param {string} id
     * @returns {Promise<Object|null>}
     */
    async findByIdWithOwner(_id) {
        void _id;
        throw new Error("Method not implemented: findByIdWithOwner");
    }

    /**
     * Returns _id and isActive only — used by middleware to gate requests.
     * @param {string} id
     * @returns {Promise<{_id:string,isActive:boolean}|null>}
     */
    async findActiveStatusById(_id) {
        void _id;
        throw new Error("Method not implemented: findActiveStatusById");
    }

    /**
     * @param {string} id
     * @returns {Promise<Object|null>}
     */
    async findActiveById(_id) {
        void _id;
        throw new Error("Method not implemented: findActiveById");
    }

    /**
     * Cross-tenant listing for superadmin only (owner joined via $lookup).
     * @returns {Promise<Array<Object>>}
     */
    async listAllWithOwner() {
        throw new Error("Method not implemented: listAllWithOwner");
    }

    /**
     * Single-pipeline listing with owner + agent headcount joined.
     * @param {string} agentRole
     * @returns {Promise<Array<Object>>}
     */
    async listAllWithOwnerAndAgentCount(_agentRole) {
        void _agentRole;
        throw new Error("Method not implemented: listAllWithOwnerAndAgentCount");
    }

    /**
     * Atomic set of the isActive flag.
     * @param {string} id
     * @param {boolean} isActive
     * @returns {Promise<Object|null>}
     */
    async setActive(_id, _isActive) {
        void _id; void _isActive;
        throw new Error("Method not implemented: setActive");
    }

    /**
     * @param {string} id
     * @param {Object} updates
     * @returns {Promise<Object|null>}
     */
    async updateById(_id, _updates) {
        void _id; void _updates;
        throw new Error("Method not implemented: updateById");
    }

    /**
     * @param {string} id
     * @param {{isActive:boolean,reason?:string}} status
     * @returns {Promise<Object|null>}
     */
    async updateStatus(_id, _status) {
        void _id; void _status;
        throw new Error("Method not implemented: updateStatus");
    }

    /**
     * @param {string} id
     * @param {'free'|'pro'} plan
     * @returns {Promise<Object|null>}
     */
    async updatePlan(_id, _plan) {
        void _id; void _plan;
        throw new Error("Method not implemented: updatePlan");
    }

    /**
     * Atomic flip of isActive — single round-trip.
     * @param {string} id
     * @returns {Promise<Object|null>}
     */
    async toggleActive(_id) {
        void _id;
        throw new Error("Method not implemented: toggleActive");
    }

    /**
     * @param {Object} filter
     * @returns {Promise<number>}
     */
    async count(_filter) {
        void _filter;
        throw new Error("Method not implemented: count");
    }

    /**
     * Total + active business counts in a single $facet round-trip.
     * @returns {Promise<{total:number, active:number}>}
     */
    async statsCounts() {
        throw new Error("Method not implemented: statsCounts");
    }
}

export default BusinessRepositoryContract;
