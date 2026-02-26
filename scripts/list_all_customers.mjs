
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env.local');

if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config();
}

const dbConnect = (await import('../lib/connectDB.js')).default;
const Customer = (await import('../models/Customer.js')).default;

async function checkAllCustomers() {
    try {
        await dbConnect();
        console.log('Connected to DB');

        const customers = await Customer.find({});
        console.log(`Found ${customers.length} customers:`);
        customers.forEach(c => {
            console.log(`ID: ${c._id}, Phone: '${c.phone}', Mobile: '${c.mobile}', OTP: ${c.phoneOTP}, Created: ${c.createdAt}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
            console.log('Disconnected');
        }
        process.exit(0);
    }
}

checkAllCustomers();
