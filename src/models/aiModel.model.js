import mongoose from "mongoose";

const aiModelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    provider: {
      type: String,
      enum: ["openai", "gemini", "custom"],
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    apiKey: {
      type: String,
      required: true,
      select: false,
    },
    endpoint: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    config: {
      maxTokens: {
        type: Number,
        default: 500,
      },
      temperature: {
        type: Number,
        default: 0.7,
      },
    },
  },
  {
    timestamps: true,
  }
);

aiModelSchema.index({ provider: 1, isActive: 1 });
aiModelSchema.index({ isDefault: 1, isActive: 1 });
aiModelSchema.index({ createdAt: -1 });

const AIModel = mongoose.model("AIModel", aiModelSchema);

export default AIModel;
