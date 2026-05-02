/**
 * @abstract
 * Contract for Customer repository.
 * Every method is tenant-scoped via businessId.
 */
class CustomerRepositoryContract {
    /**
     * @param {Object} data
     * @param {string} data.businessId
     * @returns {Promise<Object>}
     */
    async create(_data) {
        void _data;
        throw new Error("Method not implemented: create");
    }

    /**
     * @param {string} businessId
     * @param {string} email
     * @returns {Promise<Object|null>}
     */
    async findByBusinessAndEmail(_businessId, _email) {
        void _businessId; void _email;
        throw new Error("Method not implemented: findByBusinessAndEmail");
    }

    /**
     * Atomic find-or-create.
     * @param {Object} data
     * @param {string} data.businessId
     * @param {string} data.email
     * @param {string} [data.name]
     * @param {string} [data.phone]
     * @returns {Promise<Object>}
     */
    async upsertByBusinessAndEmail(_data) {
        void _data;
        throw new Error("Method not implemented: upsertByBusinessAndEmail");
    }

    /**
     * @param {Object} filter
     * @returns {Promise<number>}
     */
    async count(_filter) {
        void _filter;
        throw new Error("Method not implemented: count");
    }
}

export default CustomerRepositoryContract;
