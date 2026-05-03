/* eslint-disable no-unused-vars */

class MessageRepositoryContract {
  async create(_data) {
    throw new Error("Method not implemented: create");
  }

  async findByTicketId(_ticketId, _businessId) {
    throw new Error("Method not implemented: findByTicketId");
  }

  async findRecentByTicketIds(_ticketIds, _businessId, _limit) {
    throw new Error("Method not implemented: findRecentByTicketIds");
  }
}

export default MessageRepositoryContract;
