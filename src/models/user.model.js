import mongoose from "mongoose";
import bcrypt from "bcrypt";

/**
 * User Schema
 * Handles authentication & authorization
 */
const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3,
            maxlength: 30,
        },

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

        password: {
            type: String,
            required: true,
            minlength: 8,
            select: false, // 🚨 very important (won't return by default)
        },

        role: {
            type: String,
            enum: ["user", "agent", "admin", "superadmin"],
            default: "user",
            select: false,
        },

        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Business",
            default: null,
        },

        isActive: {
            type: Boolean,
            default: true,
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
        timestamps: true, // createdAt & updatedAt
    }
);

userSchema.pre("save", function hashPasswordBeforeSave() {
    if (!this.isModified("password")) return;
    if (/^\$2[aby]\$\d{2}\$/.test(this.password)) return;

    this.password = bcrypt.hashSync(this.password, 12);
});

const User = mongoose.model("User", userSchema);

export default User;
