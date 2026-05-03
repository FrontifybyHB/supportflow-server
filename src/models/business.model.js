import mongoose from "mongoose";

const businessSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        industry: {
            type: String,
            default: "",
            trim: true,
        },
        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500,
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },
        settings: {
            type: Object,
            default: {
                chatWidgetEnabled: true,
                autoReplyEnabled: false,
            },
        },
        plan: {
            type: String,
            enum: ["free", "pro"],
            default: "free",
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        suspensionReason: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { timestamps: true }
);

businessSchema.index({ isActive: 1, createdAt: -1 });

const Business = mongoose.model("Business", businessSchema);

export default Business;
