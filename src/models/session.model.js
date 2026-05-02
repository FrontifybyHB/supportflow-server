import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        sessionId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        refreshTokenHash: {
            type: String,
            required: true,
            select: false,
        },
        userAgent: {
            type: String,
            default: "",
        },
        ipAddress: {
            type: String,
            default: "",
        },
        expiresAt: {
            type: Date,
            required: true,
        },
    },
    { timestamps: true }
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ userId: 1, createdAt: -1 });

const Session = mongoose.model("Session", sessionSchema);

export default Session;
