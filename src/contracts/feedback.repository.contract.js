/* eslint-disable no-unused-vars */

class FeedbackRepositoryContract {
  async findTicketForTokenGeneration(_ticketId, _businessId, _options) {
    throw new Error("Method not implemented: findTicketForTokenGeneration");
  }

  async setFeedbackToken(_ticketId, _tokenHash, _expiresAt) {
    throw new Error("Method not implemented: setFeedbackToken");
  }

  async findByFeedbackTokenHash(_tokenHash) {
    throw new Error("Method not implemented: findByFeedbackTokenHash");
  }

  async submitFeedbackByTokenHash(_tokenHash, _feedback) {
    throw new Error("Method not implemented: submitFeedbackByTokenHash");
  }

  async getAnalytics(_options) {
    throw new Error("Method not implemented: getAnalytics");
  }
}

export default FeedbackRepositoryContract;
