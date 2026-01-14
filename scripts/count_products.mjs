import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://aneridelxn_db_user:YhZGkF6u2pEeVyvJ@farmferry-db.11sfqjg.mongodb.net/farmferry_data?retryWrites=true&w=majority";

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to DB");

        // Define a basic product schema if model not available
        const productSchema = new mongoose.Schema({}, { strict: false });
        const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

        const count = await Product.countDocuments();
        console.log(`Product count: ${count}`);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

run();
