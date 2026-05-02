import Session from "../models/session.model.js";
import SessionRepositoryContract from "../contracts/session.repository.contract.js";

class SessionRepository extends SessionRepositoryContract {
    constructor(model = Session) {
        super();
        this.model = model;
    }

    async create(data) {
        return this.model.create(data);
    }

    async findByUserAndSessionWithHash(userId, sessionId) {
        return this.model
            .findOne({ userId, sessionId })
            .select("+refreshTokenHash expiresAt")
            .lean();
    }

    async deleteById(sessionDocId) {
        return this.model.deleteOne({ _id: sessionDocId });
    }

    async deleteByUserAndSession(userId, sessionId) {
        return this.model.deleteOne({ userId, sessionId });
    }

    async deleteAllForUser(userId) {
        return this.model.deleteMany({ userId });
    }
}

export { SessionRepository };
export default new SessionRepository();
