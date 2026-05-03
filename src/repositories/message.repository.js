import Message from "../models/message.model.js";
import MessageRepositoryContract from "../contracts/message.repository.contract.js";

class MessageRepository extends MessageRepositoryContract {
  constructor(model = Message) {
    super();
    this.model = model;
  }

  async create(data) {
    const message = await this.model.create(data);
    return message.toObject();
  }

  async findByTicketId(ticketId, businessId) {
    return this.model
      .find({ ticketId, businessId })
      .select("ticketId businessId senderType senderId content createdAt updatedAt")
      .sort({ createdAt: 1 })
      .lean();
  }

  async findRecentByTicketIds(ticketIds, businessId, limit = 10) {
    if (!ticketIds.length) return [];

    return this.model
      .find({ ticketId: { $in: ticketIds }, businessId })
      .select("ticketId businessId senderType content createdAt")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
}

export default MessageRepository;
