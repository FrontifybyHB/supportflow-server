import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
      index: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    senderType: {
      type: String,
      enum: ["customer", "agent", "ai", "system"],
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ businessId: 1, ticketId: 1, createdAt: 1 });
messageSchema.index({ businessId: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
