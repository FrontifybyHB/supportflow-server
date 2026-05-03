import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    resolved: {
      type: Boolean,
      required: true,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    feedbackType: {
      type: String,
      enum: ["ai", "agent"],
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ticketSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    customer: {
      name: {
        type: String,
        trim: true,
        default: "Guest",
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: "",
      },
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    status: {
      type: String,
      enum: ["open", "pending", "resolved", "closed"],
      default: "open",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    category: {
      type: String,
      enum: ["billing", "account", "technical", "general", "refund", "security", "other"],
      default: "general",
    },
    isHandoff: {
      type: Boolean,
      default: false,
    },
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    source: {
      type: String,
      enum: ["chat", "email", "manual"],
      default: "chat",
    },
    feedback: {
      type: feedbackSchema,
      default: undefined,
    },
    feedbackTokenHash: {
      type: String,
      select: false,
      index: true,
    },
    feedbackTokenExpiresAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

ticketSchema.index({ businessId: 1, status: 1 });
ticketSchema.index({ businessId: 1, priority: 1 });
ticketSchema.index({ businessId: 1, category: 1 });
ticketSchema.index({ businessId: 1, assignedAgent: 1, status: 1 });
ticketSchema.index({ businessId: 1, "feedback.feedbackType": 1 });
ticketSchema.index({ businessId: 1, "feedback.submittedAt": -1 });
ticketSchema.index({ businessId: 1, createdAt: -1 });
ticketSchema.index({ businessId: 1, updatedAt: -1 });

const Ticket = mongoose.model("Ticket", ticketSchema);

export default Ticket;
