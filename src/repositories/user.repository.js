import User from "../models/user.model.js";
import UserRepositoryContract from "../contracts/user.repository.contract.js";

class UserRepository extends UserRepositoryContract {
  async create(data) {
    return User.create(data);
  }

  async findByEmail(email) {
    return User.findOne({ email }).select("+password +role");
  }

  async findByUsername(username) {
    return User.findOne({ username }).select("+password +role");
  }

  async findById(userId) {
    return User.findById(userId).select("-password -__v");
  }

  async updateById(userId, updates) {
    return User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select("-password -__v");
  }
}

export default UserRepository;
