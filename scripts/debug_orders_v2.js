import dbConnect from '../lib/connectDB.js';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' }); // Try .env.local first
dotenv.config(); // Fallback to .env

async function debugOrders() {
    try {
        console.log("🔌 Connecting to DB...");
        await dbConnect();
        console.log("✅ Connected.");

        // 1. Check Total Orders
        const totalOrders = await Order.countDocuments();
        console.log(`\n📊 Total Orders in DB: ${totalOrders}`);

        if (totalOrders === 0) {
            console.log("⚠️ No orders found in the database. Validating if this is the right DB...");
            console.log("   DB Name:", mongoose.connection.name);
            console.log("   Host:", mongoose.connection.host);
            return;
        }

        // 2. Dump first 5 orders to inspect 'customer' field type
        console.log("\n📋 Sample Orders (First 5):");
        const samples = await Order.find().limit(5).lean();

        samples.forEach((o, i) => {
            console.log(`\n--- Order #${i + 1} ---`);
            console.log(`ID: ${o._id}`);
            console.log(`Customer Field:`, o.customer);
            console.log(`Customer Field Type:`, typeof o.customer, o.customer?.constructor?.name);
            console.log(`Phone (Delivery):`, o.deliveryAddress?.phone);
            console.log(`Created At:`, o.createdAt);
        });

        // 3. Aggregate unique customer IDs
        console.log("\n👥 Distinct Customers in Orders:");
        const distinctCustomers = await Order.distinct('customer');
        console.log(`Found ${distinctCustomers.length} unique customers who have placed orders.`);
        console.log(distinctCustomers);

        // 4. Check for 'orphan' orders (orders with customer IDs that don't exist in Customer collection)
        if (distinctCustomers.length > 0) {
            const validCustomers = await Customer.find({ _id: { $in: distinctCustomers } }).select('_id name phone mobile');
            const validIds = validCustomers.map(c => c._id.toString());

            console.log(`\n✅ Valid Customers found for these orders: ${validCustomers.length}`);
            validCustomers.forEach(c => {
                console.log(`   - ${c.name} (ID: ${c._id}) | Phone: ${c.phone || c.mobile || 'N/A'}`);
            });

            const orphanIds = distinctCustomers.filter(id => !validIds.includes(id.toString()));
            if (orphanIds.length > 0) {
                console.log(`\n⚠️ ORPHAN ORDERS DETECTED! These Customer IDs are in Orders but NOT in Customer collection:`);
                console.log(orphanIds);
            }
        }

    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("\n👋 Done.");
    }
}

debugOrders();
