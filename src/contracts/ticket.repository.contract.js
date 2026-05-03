/* eslint-disable no-unused-vars */

class TicketRepositoryContract {
  async create(_data) {
    throw new Error("Method not implemented: create");
  }

  async findAll(_options) {
    throw new Error("Method not implemented: findAll");
  }

  async findById(_id, _businessId, _options) {
    throw new Error("Method not implemented: findById");
  }

  async updateStatus(_id, _businessId, _status, _options) {
    throw new Error("Method not implemented: updateStatus");
  }

  async assignAgent(_id, _businessId, _agentId, _options) {
    throw new Error("Method not implemented: assignAgent");
  }

  async findRecentByCustomer(_businessId, _customerEmail, _limit) {
    throw new Error("Method not implemented: findRecentByCustomer");
  }
}

export default TicketRepositoryContract;
