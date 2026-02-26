import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });
const MONGODB_URI = process.env.MONGODB_URI;

const Customer = mongoose.models.Customer || mongoose.model('Customer', new mongoose.Schema({
    firstName: String, lastName: String, email: String
}, { strict: false }));

async function run() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected');

    // Check the specific customer from the review log
    const id = '6967263c2d2951851c61b9c9';
    const c = await Customer.findById(id);

    if (c) {
        console.log(`ID: ${c._id}`);
        console.log(`First: ${c.firstName}`);
        console.log(`Last: ${c.lastName}`);
        console.log(`Email: ${c.email}`);
    } else {
        console.log('Customer not found');
    }

    // Also verify just generally
    const all = await Customer.find({}).limit(5);
    console.log('--- Sample Customers ---');
    all.forEach(cust => {
        console.log(`${cust._id}: ${cust.firstName} ${cust.lastName}`);
    });

    process.exit();
}
run();
