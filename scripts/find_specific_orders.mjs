import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });
const MONGODB_URI = process.env.MONGODB_URI;

// Use 'strict: false' to ensure we see the raw stored structure
const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

async function run() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');

    // Search for ANY orders containing '48083' in delivery address phone
    const partial = '48083';
    const orders = await Order.find({
        'deliveryAddress.phone': { $regex: partial, $options: 'i' }
    });

    console.log(`\n--- Searching for *${partial}* in deliveryAddress.phone ---`);
    console.log(`Found: ${orders.length} orders.`);

    orders.forEach(o => {
        console.log(`JSON: ${JSON.stringify(o.deliveryAddress)}`);
        console.log(`User: ${o.customer}`);
        console.log('---');
    });

    process.exit();
}
run();
