/* eslint-disable no-console */
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import User from '../src/models/user.model.js';

dotenv.config();

const createSuperAdmin = async () => {
    try {
        // Connect to database
        await mongoose.connect(process.env.DB_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/supportflow');
        console.log('Connected to MongoDB');

        // Check if super admin already exists
        const existingSuperAdmin = await User.findOne({ role: 'superadmin' });
        if (existingSuperAdmin) {
            console.log('Super admin already exists:', existingSuperAdmin.email);
            process.exit(0);
        }

        // Get super admin details from environment or prompt
        const email = process.env.SUPERADMIN_EMAIL || '';
        const password = process.env.SUPERADMIN_PASSWORD || '';
        const name = process.env.SUPERADMIN_NAME || '';

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create super admin
        const superAdmin = await User.create({
            name,
            email,
            passwordHash,
            role: 'superadmin',
            authProviders: ['password'],
            isEmailVerified: true,
            isActive: true,
        });

        console.log('✅ Super admin created successfully!');
        console.log('Email:', superAdmin.email);
        console.log('Password:', password);
        console.log('Name:', superAdmin.name);
        console.log('Role:', superAdmin.role);

    } catch (error) {
        console.error('❌ Error creating super admin:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
};

createSuperAdmin();
