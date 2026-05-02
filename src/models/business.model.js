import mongoose from "mongoose";

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usage: {
      aiCalls: {
        type: Number,
        default: 0,
      },
      tokensConsumed: {
        type: Number,
        default: 0,
      },
      costEstimate: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

businessSchema.index({ ownerId: 1 });
businessSchema.index({ isActive: 1, plan: 1 });
businessSchema.index({ createdAt: -1 });

const Business = mongoose.model("Business", businessSchema);

export default Business;
