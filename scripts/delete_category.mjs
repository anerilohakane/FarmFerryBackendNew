
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env.local');

console.log('Loading env from:', envPath);
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config();
}

// Dynamic import for dbConnect
const dbConnect = (await import('../lib/connectDB.js')).default;
const Category = (await import('../models/Category.js')).default;

async function deleteTestCategory() {
    try {
        await dbConnect();
        console.log('Connected to DB');

        // Find categories with "test" in the name (case insensitive)
        const categories = await Category.find({ name: { $regex: /test/i } });

        if (categories.length === 0) {
            console.log('No categories found with "test" in the name.');
        } else {
            console.log(`Found ${categories.length} categories:`);
            categories.forEach(c => console.log(`- ${c.name} (${c._id})`));

            // Delete them
            const result = await Category.deleteMany({ name: { $regex: /test/i } });
            console.log(`Deleted ${result.deletedCount} categories.`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        // Only disconnect if we are done, assuming dbConnect establishes a persistent connection
        // But since it's a script, we can just exit or disconnect
        // mongoose.disconnect() might hang if not connected properly?
        // checking connection state
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
            console.log('Disconnected');
        }
        process.exit(0);
    }
}

deleteTestCategory();
