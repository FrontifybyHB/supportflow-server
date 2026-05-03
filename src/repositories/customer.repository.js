import Customer from "../models/customer.model.js";
import CustomerRepositoryContract from "../contracts/customer.repository.contract.js";

class CustomerRepository extends CustomerRepositoryContract {
    constructor(model = Customer) {
        super();
        this.model = model;
    }

    async create(data) {
        const doc = await this.model.create(data);
        return doc.toObject();
    }

    async findByBusinessAndEmail(businessId, email) {
        return this.model.findOne({ businessId, email }).lean();
    }

    /**
     * Atomic find-or-create for an emailed customer of a business.
     * Defaults are only written on insert ($setOnInsert).
     */
    async upsertByBusinessAndEmail({ businessId, email, name, phone }) {
        return this.model
            .findOneAndUpdate(
                { businessId, email },
                {
                    $setOnInsert: {
                        businessId,
                        email,
                        name: name || "Guest",
                        phone: phone || null,
                    },
                },
                {
                    returnDocument: "after",
                    upsert: true,
                    runValidators: true,
                    setDefaultsOnInsert: true,
                }
            )
            .lean();
    }

    async count(filter = {}) {
        return this.model.countDocuments(filter);
    }
}

export { CustomerRepository };
export default new CustomerRepository();
