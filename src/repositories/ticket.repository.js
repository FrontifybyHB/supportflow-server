import Ticket from "../models/ticket.model.js";
import TicketRepositoryContract from "../contracts/ticket.repository.contract.js";

class TicketRepository extends TicketRepositoryContract {
  constructor(model = Ticket) {
    super();
    this.model = model;
  }

  async create(data) {
    const ticket = await this.model.create(data);
    return ticket.toObject();
  }

  async findAll({
    businessId,
    status,
    priority,
    assignedAgent,
    includeUnassigned = false,
    page = 1,
    limit = 20,
    allowCrossTenant = false,
  } = {}) {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const filter = {};

    if (!allowCrossTenant) filter.businessId = businessId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedAgent && includeUnassigned) {
      filter.$or = [{ assignedAgent }, { assignedAgent: null }];
    } else if (assignedAgent) {
      filter.assignedAgent = assignedAgent;
    }

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .select("businessId customer subject status priority assignedAgent source createdAt updatedAt")
        .sort({ updatedAt: -1 })
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

  async findById(id, businessId, { allowCrossTenant = false } = {}) {
    const filter = { _id: id };
    if (!allowCrossTenant) filter.businessId = businessId;

    return this.model
      .findOne(filter)
      .select("businessId customer subject status priority assignedAgent source createdAt updatedAt")
      .lean();
  }

  async updateStatus(id, businessId, status, { allowCrossTenant = false } = {}) {
    const filter = { _id: id };
    if (!allowCrossTenant) filter.businessId = businessId;

    return this.model.findOneAndUpdate(
      filter,
      { status },
      { new: true, runValidators: true }
    )
      .select("businessId customer subject status priority assignedAgent source createdAt updatedAt")
      .lean();
  }

  async assignAgent(id, businessId, agentId, { allowCrossTenant = false } = {}) {
    const filter = { _id: id };
    if (!allowCrossTenant) filter.businessId = businessId;

    return this.model.findOneAndUpdate(
      filter,
      { assignedAgent: agentId },
      { new: true, runValidators: true }
    )
      .select("businessId customer subject status priority assignedAgent source createdAt updatedAt")
      .lean();
  }
}

export default TicketRepository;
