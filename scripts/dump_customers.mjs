import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });
const MONGODB_URI = process.env.MONGODB_URI;

// Use strict: false to see ALL fields
const Customer = mongoose.models.Customer || mongoose.model('Customer', new mongoose.Schema({}, { strict: false }));

async function run() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected');

    const customers = await Customer.find({}).limit(3);
    console.log(JSON.stringify(customers, null, 2));

    process.exit();
}
run();
