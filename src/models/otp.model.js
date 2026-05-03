import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        otpHash: {
            type: String,
            required: true,
            select: false,
        },
        purpose: {
            type: String,
            enum: ["email_verification", "password_reset"],
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

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ userId: 1, purpose: 1, used: 1 });

const OTP = mongoose.model("OTP", otpSchema);

export default OTP;
