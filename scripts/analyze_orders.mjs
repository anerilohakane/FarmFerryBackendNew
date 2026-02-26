import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });
const MONGODB_URI = process.env.MONGODB_URI;

const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

async function run() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');

    const orders = await Order.find({}, 'customer deliveryAddress.phone').sort({ createdAt: -1 }).limit(100);

    console.log(`\n--- Analyzed ${orders.length} recent orders ---`);

    const customerCounts = {};
    const phoneCounts = {};

    orders.forEach(o => {
        const c = o.customer ? o.customer.toString() : 'null';
        const p = o.deliveryAddress?.phone || 'null';

        customerCounts[c] = (customerCounts[c] || 0) + 1;
        phoneCounts[p] = (phoneCounts[p] || 0) + 1;
    });

    console.log('\nTop Customers (by Order Count):');
    Object.entries(customerCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([id, count]) => {
        console.log(`- ${id}: ${count}`);
    });

    console.log('\nTop Phones (by Order Count):');
    Object.entries(phoneCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([ph, count]) => {
        console.log(`- ${ph}: ${count}`);
    });

    process.exit();
}
run();
