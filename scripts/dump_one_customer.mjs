import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });
const MONGODB_URI = process.env.MONGODB_URI;

// Use strict: false to see ALL fields
const Customer = mongoose.models.Customer || mongoose.model('Customer', new mongoose.Schema({}, { strict: false }));

async function run() {
    await mongoose.connect(MONGODB_URI);

    const id = '6967263c2d2951851c61b9c9';
    const customer = await Customer.findOne({ _id: id });

    const out = JSON.stringify(customer, null, 2);
    fs.writeFileSync('c:\\Users\\User\\Desktop\\farmferry\\customer_dump.json', out);
    console.log('Dumped to customer_dump.json');

    process.exit();
}
run();
