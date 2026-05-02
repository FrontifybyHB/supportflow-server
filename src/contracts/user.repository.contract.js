/* eslint-disable no-unused-vars */

class UserRepositoryContract {
  async create(_data) {
    throw new Error("create() must be implemented");
  }

  async findByEmail(_email) {
    throw new Error("findByEmail() must be implemented");
  }

  async findByUsername(_username) {
    throw new Error("findByUsername() must be implemented");
  }

  async findById(_id) {
    throw new Error("findById() must be implemented");
  }

  async findByIdWithEmailVerificationToken(_id) {
    throw new Error("findByIdWithEmailVerificationToken() must be implemented");
  }

  async updateById(_id, _updates) {
    throw new Error("updateById() must be implemented");
  }
}

export default UserRepositoryContract;
