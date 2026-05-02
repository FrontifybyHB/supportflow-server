/* eslint-disable no-console */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import config from '../src/config/config.js';
import redis from '../src/config/redis.config.js';
import { isQueueConfigured } from '../src/queues/email.queue.js';

dotenv.config();

const testSystem = async () => {
    console.log('🔍 Testing SupportFlow Server Components...\n');

    // Test MongoDB Connection
    try {
        await mongoose.connect(config.DB_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/supportflow');
        console.log('✅ MongoDB: Connected successfully');
    } catch (error) {
        console.log('❌ MongoDB: Connection failed -', error.message);
    }

    // Test Redis Cache (Upstash)
    try {
        if (redis) {
            const testKey = 'test-key';
            const testValue = 'test-value';
            await redis.set(testKey, testValue, { ex: 10 });
            const retrieved = await redis.get(testKey);
            await redis.del(testKey);
            
            if (retrieved === testValue) {
                console.log('✅ Upstash Redis Cache: Working correctly');
            } else {
                console.log('❌ Upstash Redis Cache: Data mismatch');
            }
        } else {
            console.log('⚠️  Upstash Redis Cache: Not configured');
        }
    } catch (error) {
        console.log('❌ Upstash Redis Cache: Error -', error.message);
    }

    // Test BullMQ Redis
    try {
        if (isQueueConfigured()) {
            console.log('✅ BullMQ Redis: Configured and ready');
        } else {
            console.log('⚠️  BullMQ Redis: Not configured (will use fallback)');
        }
    } catch (error) {
        console.log('❌ BullMQ Redis: Error -', error.message);
    }

    // Test Email Configuration
    try {
        const hasSmtp = Boolean(config.EMAIL_HOST && config.EMAIL_USER && config.EMAIL_PASSWORD);
        if (hasSmtp) {
            console.log('✅ Email Service: SMTP configured');
        } else {
            console.log('⚠️  Email Service: SMTP not configured (will log emails)');
        }
    } catch (error) {
        console.log('❌ Email Service: Error -', error.message);
    }

    // Test Google OAuth
    try {
        if (config.GOOGLE_CLIENT_ID) {
            console.log('✅ Google OAuth: Client ID configured');
        } else {
            console.log('⚠️  Google OAuth: Not configured');
        }
    } catch (error) {
        console.log('❌ Google OAuth: Error -', error.message);
    }

    console.log('\n🎯 System Test Complete!');
    console.log('\n📝 Configuration Summary:');
    console.log('- Account identifier: Email only');
    console.log('- Authentication: Email/Password only');
    console.log('- Email: Nodemailer with SMTP support');
    console.log('- Queue: BullMQ with Redis (fallback available)');
    console.log('- Cache: Upstash Redis (optional)');
    console.log('- OAuth: Google (optional)');

    await mongoose.disconnect();
    process.exit(0);
};

testSystem().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
