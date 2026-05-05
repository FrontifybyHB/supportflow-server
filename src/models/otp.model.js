import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            index: true,
        },
        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Business",
            index: true,
        },
        otpHash: {
            type: String,
            required: true,
            select: false,
        },
        purpose: {
            type: String,
            enum: ["email_verification", "customer_email_verification", "password_reset"],
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        used: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

otpSchema.pre("validate", function requireOtpSubject() {
    if (!this.userId && !this.customerId) {
        throw new Error("OTP requires either userId or customerId");
    }
});

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ userId: 1, purpose: 1, used: 1 });
otpSchema.index({ customerId: 1, purpose: 1, used: 1 });

const OTP = mongoose.model("OTP", otpSchema);

export default OTP;
