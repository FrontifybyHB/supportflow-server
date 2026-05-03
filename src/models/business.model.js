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
        activeAIModel: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AIModel",
            default: null,
            index: true,
        },
        knowledgeBase: {
            type: [
                {
                    title: {
                        type: String,
                        trim: true,
                        maxlength: 160,
                        required: true,
                    },
                    content: {
                        type: String,
                        trim: true,
                        maxlength: 3000,
                        required: true,
                    },
                    tags: {
                        type: [String],
                        default: [],
                    },
                    isActive: {
                        type: Boolean,
                        default: true,
                    },
                },
            ],
            default: [],
        },
        aiUsage: {
            aiCalls: {
                type: Number,
                default: 0,
                min: 0,
            },
            tokensConsumed: {
                type: Number,
                default: 0,
                min: 0,
            },
            costEstimate: {
                type: Number,
                default: 0,
                min: 0,
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
businessSchema.index({ _id: 1, "knowledgeBase.isActive": 1 });

const Business = mongoose.model("Business", businessSchema);

export default Business;
