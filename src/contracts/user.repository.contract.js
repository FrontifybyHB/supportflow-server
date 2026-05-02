/**
 * @abstract
 * Contract for User repository.
 * Auth flows (login, refresh, password reset) are intentionally cross-tenant:
 * they look up the User by email/_id without a businessId filter.
 * Tenant-scoped operations (agent listing, role updates) MUST include businessId.
 */
class UserRepositoryContract {
    /** @returns {Promise<Object>} */
    async create(_data) {
        void _data;
        throw new Error("Method not implemented: create");
    }

    /**
     * Lean lookup without sensitive fields. Used to detect duplicate emails on register.
     * @param {string} email
     * @returns {Promise<Object|null>}
     */
    async existsByEmail(_email) {
        void _email;
        throw new Error("Method not implemented: existsByEmail");
    }

    /**
     * Lean document including passwordHash. Used by login + agent provisioning rule checks.
     * @param {string} email
     * @returns {Promise<Object|null>}
     */
    async findByEmailWithPassword(_email) {
        void _email;
        throw new Error("Method not implemented: findByEmailWithPassword");
    }

    /**
     * Lean document without passwordHash.
     * @param {string} email
     * @returns {Promise<Object|null>}
     */
    async findByEmail(_email) {
        void _email;
        throw new Error("Method not implemented: findByEmail");
    }

    /**
     * Cross-tenant role lookup for bootstrap/admin checks.
     * @param {string} role
     * @returns {Promise<Object|null>}
     */
    async findOneByRole(_role) {
        void _role;
        throw new Error("Method not implemented: findOneByRole");
    }

    /**
     * Lean document without passwordHash.
     * @param {string} userId
     * @returns {Promise<Object|null>}
     */
    async findById(_userId) {
        void _userId;
        throw new Error("Method not implemented: findById");
    }

    /**
     * @param {string} userId
     * @param {Object} updates
     * @returns {Promise<Object|null>}
     */
    async updateById(_userId, _updates) {
        void _userId; void _updates;
        throw new Error("Method not implemented: updateById");
    }

    /**
     * Tenant-scoped agent listing.
     * @param {string} businessId
     * @param {string} role
     * @returns {Promise<Array<Object>>}
     */
    async listByBusinessAndRole(_businessId, _role) {
        void _businessId; void _role;
        throw new Error("Method not implemented: listByBusinessAndRole");
    }

    /**
     * Tenant-scoped paginated role listing.
     * @param {Object} params
     * @returns {Promise<{data:Array<Object>,total:number,page:number,totalPages:number}>}
     */
    async paginateByBusinessAndRole(_params) {
        void _params;
        throw new Error("Method not implemented: paginateByBusinessAndRole");
    }

    /**
     * Tenant-scoped agent update (atomic).
     * @param {string} userId
     * @param {string} businessId
     * @param {string} role
     * @param {Object} updates
     * @returns {Promise<Object|null>}
     */
    async updateScopedByRole(_userId, _businessId, _role, _updates) {
        void _userId; void _businessId; void _role; void _updates;
        throw new Error("Method not implemented: updateScopedByRole");
    }

    /**
     * Bulk deactivate agents/admins of a business (used when a business is disabled).
     * @param {string} businessId
     * @param {Array<string>} roles
     * @returns {Promise<{modifiedCount:number}>}
     */
    async deactivateByBusinessAndRoles(_businessId, _roles) {
        void _businessId; void _roles;
        throw new Error("Method not implemented: deactivateByBusinessAndRoles");
    }

    /**
     * Cross-tenant paginated listing for superadmin.
     * @param {Object} params
     * @param {Object} params.filter
     * @param {number} params.page
     * @param {number} params.limit
     * @returns {Promise<{data:Array<Object>,total:number,page:number,totalPages:number}>}
     */
    async paginate(_params) {
        void _params;
        throw new Error("Method not implemented: paginate");
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
     * Total user count plus per-role counts in a single $facet round-trip.
     * @param {Array<string>} roles
     * @returns {Promise<{total:number, byRole:Object<string,number>}>}
     */
    async statsByRoles(_roles) {
        void _roles;
        throw new Error("Method not implemented: statsByRoles");
    }
}

export default UserRepositoryContract;
