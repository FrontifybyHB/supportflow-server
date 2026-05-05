import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            default: "Guest",
            trim: true,
            maxlength: 80,
        },
        email: {
            type: String,
            default: null,
            lowercase: true,
            trim: true,
        },
        phone: {
            type: String,
            default: null,
            trim: true,
        },
        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Business",
            required: true,
            index: true,
        },
    },
    { timestamps: true }
);

customerSchema.index({ businessId: 1, email: 1 });

const Customer = mongoose.model("Customer", customerSchema);

export default Customer;
