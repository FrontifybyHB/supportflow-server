import mongoose from "mongoose";

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
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
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
  },
  {
    timestamps: true,
  }
);

ticketSchema.index({ businessId: 1, status: 1 });
ticketSchema.index({ businessId: 1, priority: 1 });
ticketSchema.index({ businessId: 1, assignedAgent: 1, status: 1 });
ticketSchema.index({ businessId: 1, createdAt: -1 });
ticketSchema.index({ businessId: 1, updatedAt: -1 });

const Ticket = mongoose.model("Ticket", ticketSchema);

export default Ticket;
