import Business from "../models/business.model.js";
import BusinessRepositoryContract from "../contracts/business.repository.contract.js";
import cacheService from "../services/cache.service.js";

const BUSINESS_CACHE_TTL = 60;
const PUBLIC_BUSINESSES_CACHE_KEY = "business:public:active";
const businessCacheKeys = (id) => ({
    full: `business:byId:${id}`,
    status: `business:status:${id}`,
    active: `business:active:${id}`,
    knowledge: `business:knowledge:${id}`,
});

class BusinessRepository extends BusinessRepositoryContract {
    constructor(model = Business, cache = cacheService) {
        super();
        this.model = model;
        this.cache = cache;
    }

    async create(data) {
        const business = await this.model.create(data);
        await this.cache.del(PUBLIC_BUSINESSES_CACHE_KEY);
        return business;
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
        await this.cache.delMany([
            keys.full,
            keys.status,
            keys.active,
            keys.knowledge,
            PUBLIC_BUSINESSES_CACHE_KEY,
        ]);
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

    async listPublicActive() {
        return this.cache.wrap(
            PUBLIC_BUSINESSES_CACHE_KEY,
            BUSINESS_CACHE_TTL,
            () => this.model
                .find({ isActive: true })
                .select("_id name industry description settings.chatWidgetEnabled isActive createdAt")
                .sort({ name: 1, createdAt: -1 })
                .lean()
        );
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

    async getBusinessKnowledge(id, query = "", limit = 3) {
        if (!id) return [];

        const business = await this.cache.wrap(
            `business:knowledge:${id}`,
            300,
            () => this.model
                .findById(id)
                .select("knowledgeBase")
                .lean()
        );

        const entries = business?.knowledgeBase?.filter((entry) => entry.isActive) || [];
        const tokens = String(query)
            .toLowerCase()
            .split(/\W+/)
            .filter((token) => token.length >= 3);

        const scoreEntry = (entry) => {
            const haystack = [
                entry.title,
                entry.content,
                ...(entry.tags || []),
            ].join(" ").toLowerCase();

            return tokens.reduce((score, token) => (
                haystack.includes(token) ? score + 1 : score
            ), 0);
        };

        return entries
            .map((entry) => ({ entry, score: scoreEntry(entry) }))
            .filter(({ score }) => score > 0 || tokens.length === 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, Math.max(Number(limit) || 3, 1))
            .map(({ entry }) => ({
                title: entry.title,
                content: entry.content,
                tags: entry.tags || [],
            }));
    }

    async incrementUsage(id, usage = {}) {
        if (!id) return null;

        return this.model
            .findByIdAndUpdate(
                id,
                {
                    $inc: {
                        "aiUsage.aiCalls": Math.max(Number(usage.aiCalls) || 0, 0),
                        "aiUsage.tokensConsumed": Math.max(Number(usage.tokensConsumed) || 0, 0),
                        "aiUsage.costEstimate": Math.max(Number(usage.costEstimate) || 0, 0),
                    },
                },
                { returnDocument: "after", runValidators: true }
            )
            .select("_id aiUsage")
            .lean();
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
