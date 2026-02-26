import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });
const MONGODB_URI = process.env.MONGODB_URI;

const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({
    deliveryAddress: { phone: String, name: String },
    customer: mongoose.Schema.Types.ObjectId,
    orderId: String
}, { strict: false }));

async function run() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');

    const orders = await Order.find({}, 'deliveryAddress.phone customer orderId').sort({ createdAt: -1 }).limit(50);

    console.log(`\n--- Dumping Phones from last 50 Orders ---`);
    orders.forEach(o => {
        const phone = o.deliveryAddress?.phone;
        console.log(`Order: ${o.orderId || o._id} | Cust: ${o.customer} | Phone: '${phone}'`);
    });

    process.exit();
}
run();
