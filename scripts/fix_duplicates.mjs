
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

async function fixDuplicates() {
    try {
        await dbConnect();
        console.log('Connected to DB. Checking for duplicates...');

        // Aggregation to find phone/mobiles with count > 1
        const duplicates = await Customer.aggregate([
            {
                $group: {
                    _id: { $ifNull: ["$phone", "$mobile"] },
                    count: { $sum: 1 },
                    ids: { $push: "$_id" }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]);

        if (duplicates.length === 0) {
            console.log("No exact duplicates found.");
        } else {
            console.log(`Found ${duplicates.length} duplicate groups.`);
            for (const grp of duplicates) {
                console.log(`Phone ${grp._id}: ${grp.count} records. Keeping latest.`);
                // Sort by ID (assume latest is better or verify logic)
                // Or sort by updatedAt if available
                const docs = await Customer.find({ _id: { $in: grp.ids } }).sort({ updatedAt: -1 });

                const [keep, ...remove] = docs;
                console.log(`Keeping ${keep._id} (Updated: ${keep.updatedAt})`);

                for (const r of remove) {
                    console.log(`Deleting duplicate ${r._id} (Updated: ${r.updatedAt})`);
                    await Customer.deleteOne({ _id: r._id });
                }
            }
        }

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

fixDuplicates();
