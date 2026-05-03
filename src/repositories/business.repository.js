import Business from "../models/business.model.js";
import BusinessRepositoryContract from "../contracts/business.repository.contract.js";
import cacheService from "../services/cache.service.js";

const BUSINESS_CACHE_TTL = 60;
const businessCacheKeys = (id) => ({
    full: `business:byId:${id}`,
    status: `business:status:${id}`,
    active: `business:active:${id}`,
});

class BusinessRepository extends BusinessRepositoryContract {
    constructor(model = Business, cache = cacheService) {
        super();
        this.model = model;
        this.cache = cache;
    }

    async create(data) {
        return this.model.create(data);
    }

    async findById(id) {
        if (!id) return null;
        return this.cache.wrap(
            businessCacheKeys(id).full,
            BUSINESS_CACHE_TTL,
            () => this.model.findById(id).lean()
        );
    }

    async findByIdWithOwner(id) {
        if (!id) return null;
        return this.model
            .findById(id)
            .populate("ownerId", "name email")
            .lean();
    }

    async findActiveStatusById(id) {
        if (!id) return null;
        return this.cache.wrap(
            businessCacheKeys(id).status,
            BUSINESS_CACHE_TTL,
            () => this.model.findById(id).select("isActive").lean()
        );
    }

    async findActiveById(id) {
        if (!id) return null;
        return this.cache.wrap(
            businessCacheKeys(id).active,
            BUSINESS_CACHE_TTL,
            () => this.model.findOne({ _id: id, isActive: true }).lean()
        );
    }

    async invalidateById(id) {
        if (!id) return;
        const keys = businessCacheKeys(id);
        await this.cache.delMany([keys.full, keys.status, keys.active]);
    }

    async listAllWithOwner() {
        return this.model.aggregate([
            { $match: {} },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: "users",
                    localField: "ownerId",
                    foreignField: "_id",
                    pipeline: [{ $project: { name: 1, email: 1, role: 1 } }],
                    as: "owner",
                },
            },
            {
                $addFields: {
                    ownerId: { $arrayElemAt: ["$owner", 0] },
                },
            },
            { $project: { owner: 0 } },
        ]);
    }

    /**
     * Single-pipeline aggregation that joins owner info and the agent headcount.
     * Replaces N+1 (1 list + N counts) with a single round-trip.
     * @param {string} agentRole
     */
    async listAllWithOwnerAndAgentCount(agentRole) {
        return this.model.aggregate([
            { $match: {} },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: "users",
                    localField: "ownerId",
                    foreignField: "_id",
                    pipeline: [{ $project: { name: 1, email: 1, role: 1 } }],
                    as: "owner",
                },
            },
            {
                $lookup: {
                    from: "users",
                    let: { bid: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$businessId", "$$bid"] },
                                        { $eq: ["$role", agentRole] },
                                    ],
                                },
                            },
                        },
                        { $count: "total" },
                    ],
                    as: "agentStats",
                },
            },
            {
                $addFields: {
                    ownerId: { $arrayElemAt: ["$owner", 0] },
                    agentCount: {
                        $ifNull: [{ $arrayElemAt: ["$agentStats.total", 0] }, 0],
                    },
                },
            },
            { $project: { owner: 0, agentStats: 0 } },
        ]);
    }

    async setActive(id, isActive) {
        const updated = await this.model
            .findByIdAndUpdate(
                id,
                { $set: { isActive } },
                { returnDocument: "after", runValidators: true }
            )
            .lean();
        if (updated) await this.invalidateById(id);
        return updated;
    }

    async updateById(id, updates) {
        const updated = await this.model
            .findByIdAndUpdate(
                id,
                { $set: updates },
                { returnDocument: "after", runValidators: true }
            )
            .lean();
        if (updated) await this.invalidateById(id);
        return updated;
    }

    async updateStatus(id, { isActive, reason = "" }) {
        const updated = await this.model
            .findByIdAndUpdate(
                id,
                {
                    $set: {
                        isActive,
                        suspensionReason: isActive ? "" : reason,
                    },
                },
                { returnDocument: "after", runValidators: true }
            )
            .lean();
        if (updated) await this.invalidateById(id);
        return updated;
    }

    async updatePlan(id, plan) {
        const updated = await this.model
            .findByIdAndUpdate(
                id,
                { $set: { plan } },
                { returnDocument: "after", runValidators: true }
            )
            .lean();
        if (updated) await this.invalidateById(id);
        return updated;
    }

    /**
     * Atomic flip of the isActive flag using an aggregation-pipeline update.
     * Eliminates the read-then-write round-trip.
     */
    async toggleActive(id) {
        const updated = await this.model
            .findByIdAndUpdate(
                id,
                [{ $set: { isActive: { $not: "$isActive" } } }],
                { returnDocument: "after", runValidators: true }
            )
            .lean();
        if (updated) await this.invalidateById(id);
        return updated;
    }

    async count(filter = {}) {
        return this.model.countDocuments(filter);
    }

    /**
     * Returns total + active business counts in a single round-trip via $facet.
     * @returns {Promise<{total:number, active:number}>}
     */
    async statsCounts() {
        const [result] = await this.model.aggregate([
            {
                $facet: {
                    total: [{ $count: "value" }],
                    active: [{ $match: { isActive: true } }, { $count: "value" }],
                },
            },
        ]);

        return {
            total: result?.total?.[0]?.value ?? 0,
            active: result?.active?.[0]?.value ?? 0,
        };
    }
}

export { BusinessRepository };
export default new BusinessRepository();
