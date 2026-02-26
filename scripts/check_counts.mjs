import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });
const MONGODB_URI = process.env.MONGODB_URI;

const Customer = mongoose.models.Customer || mongoose.model('Customer', new mongoose.Schema({}, { strict: false }));
const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

async function run() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');

    const partial = '48083'; // last 5 digits

    // Find ALL customers matching phone
    const customers = await Customer.find({
        $or: [
            { phone: { $regex: partial } },
            { mobile: { $regex: partial } }
        ]
    });

    console.log(`\nFound ${customers.length} customers with *${partial}*:`);
    for (const c of customers) {
        console.log(`- ID: ${c._id} | Phone: ${c.phone} | Mobile: ${c.mobile}`);

        // key check: orders for this customer ID
        const count = await Order.countDocuments({ customer: c._id });
        console.log(`  -> Orders linked by ID: ${count}`);
    }

    process.exit();
}
run();
