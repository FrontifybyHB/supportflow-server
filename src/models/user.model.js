import mongoose from "mongoose";

/**
 * User Schema
 * Handles authentication, authorization, and tenant membership.
 */
const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 50,
        },

        passwordHash: {
            type: String,
            minlength: 8,
            select: false,
        },

        googleId: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
        },

        avatarUrl: {
            type: String,
            default: "",
        },

        authProviders: {
            type: [String],
            enum: ["password", "google"],
            default: ["password"],
        },

        role: {
            type: String,
            enum: ["customer", "agent", "admin", "superadmin"],
            default: "customer",
            index: true,
        },

        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Business",
            default: null,
            index: true,
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },

        isEmailVerified: {
            type: Boolean,
            default: false,
        },

        emailVerificationToken: {
            type: String,
            select: false,
        },
    },
    {
        timestamps: true,
    }
);

userSchema.index({ businessId: 1, role: 1 });
userSchema.index({ businessId: 1, isActive: 1 });

const User = mongoose.model("User", userSchema);

export default User;
