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
     * Defaults are written on insert; provided profile fields refresh existing rows.
     */
    async upsertByBusinessAndEmail({ businessId, email, name, phone }) {
        const set = {};
        if (name) set.name = name;
        if (phone) set.phone = phone;
        const setOnInsert = { businessId, email };
        if (!name) setOnInsert.name = "Guest";
        if (!phone) setOnInsert.phone = null;

        return this.model
            .findOneAndUpdate(
                { businessId, email },
                {
                    ...(Object.keys(set).length && { $set: set }),
                    $setOnInsert: setOnInsert,
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
