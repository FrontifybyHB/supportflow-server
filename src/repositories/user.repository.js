import User from "../models/user.model.js";
import UserRepositoryContract from "../contracts/user.repository.contract.js";

const SAFE_PROJECTION = "-passwordHash -__v";

class UserRepository extends UserRepositoryContract {
    constructor(model = User) {
        super();
        this.model = model;
    }

    async create(data) {
        return this.model.create(data);
    }

    async existsByEmail(email) {
        return this.model.findOne({ email }).select("_id").lean();
    }

    async findByEmailWithPassword(email) {
        return this.model.findOne({ email }).select("+passwordHash").lean();
    }

    async findByEmail(email) {
        return this.model.findOne({ email }).select(SAFE_PROJECTION).lean();
    }

    async findOneByRole(role) {
        return this.model.findOne({ role }).select(SAFE_PROJECTION).lean();
    }

    async findById(userId) {
        if (!userId) return null;
        return this.model.findById(userId).select(SAFE_PROJECTION).lean();
    }

    async updateById(userId, updates) {
        return this.model
            .findByIdAndUpdate(userId, updates, { returnDocument: "after", runValidators: true })
            .select(SAFE_PROJECTION)
            .lean();
    }

    async listByBusinessAndRole(businessId, role) {
        return this.model
            .find({ businessId, role })
            .select(SAFE_PROJECTION)
            .sort({ createdAt: -1 })
            .lean();
    }

    async paginateByBusinessAndRole({ businessId, role, isActive, page = 1, limit = 20 }) {
        const safePage = Math.max(Number(page) || 1, 1);
        const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
        const filter = { businessId, role };

        if (isActive !== undefined) {
            filter.isActive = isActive;
        }

        const [data, total] = await Promise.all([
            this.model
                .find(filter)
                .select(SAFE_PROJECTION)
                .sort({ createdAt: -1 })
                .skip((safePage - 1) * safeLimit)
                .limit(safeLimit)
                .lean(),
            this.model.countDocuments(filter),
        ]);

        return {
            data,
            total,
            page: safePage,
            totalPages: Math.ceil(total / safeLimit),
        };
    }

    async updateScopedByRole(userId, businessId, role, updates) {
        return this.model
            .findOneAndUpdate(
                { _id: userId, businessId, role },
                updates,
                { returnDocument: "after", runValidators: true }
            )
            .select(SAFE_PROJECTION)
            .lean();
    }

    async deactivateByBusinessAndRoles(businessId, roles) {
        const result = await this.model.updateMany(
            { businessId, role: { $in: roles } },
            { isActive: false }
        );

        return { modifiedCount: result.modifiedCount ?? 0 };
    }

    async paginate({ filter = {}, page = 1, limit = 20 }) {
        const safePage = Math.max(Number(page) || 1, 1);
        const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

        const [data, total] = await Promise.all([
            this.model
                .find(filter)
                .select(SAFE_PROJECTION)
                .sort({ createdAt: -1 })
                .skip((safePage - 1) * safeLimit)
                .limit(safeLimit)
                .lean(),
            this.model.countDocuments(filter),
        ]);

        return {
            data,
            total,
            page: safePage,
            totalPages: Math.ceil(total / safeLimit),
        };
    }

    async count(filter = {}) {
        return this.model.countDocuments(filter);
    }

    /**
     * Returns total user count and a per-role breakdown for the given roles
     * in a single round-trip via $facet.
     * @param {Array<string>} roles
     * @returns {Promise<{total:number, byRole:Object<string,number>}>}
     */
    async statsByRoles(roles) {
        const facet = { total: [{ $count: "value" }] };
        for (const role of roles) {
            facet[role] = [{ $match: { role } }, { $count: "value" }];
        }

        const [result] = await this.model.aggregate([{ $facet: facet }]);
        const pick = (key) => result?.[key]?.[0]?.value ?? 0;

        const byRole = {};
        for (const role of roles) byRole[role] = pick(role);

        return { total: pick("total"), byRole };
    }
}

export { UserRepository };
export default new UserRepository();
