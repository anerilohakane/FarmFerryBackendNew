import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env.local') });

async function setup() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) throw new Error("Missing MONGODB_URI");

  console.log("🔌 Connecting to DB...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected");

  const db = mongoose.connection.db;

  /* ---------------- SETUP SUPPLIER ---------------- */
  const suppliers = db.collection('suppliers');
  const email = "anish@supplier.com";
  
  let supplier = await suppliers.findOne({ email });
  if (!supplier) {
    console.error(`❌ Supplier ${email} not found! Please create it first or check the DB.`);
    process.exit(1);
  }

  console.log(`👤 Found Supplier: ${supplier.ownerName} (${supplier._id})`);

  if (supplier.status !== 'approved') {
    console.log(`⚠️ Supplier status is '${supplier.status}'. Updating to 'approved'...`);
    await suppliers.updateOne(
        { _id: supplier._id },
        { 
            $set: { 
                status: 'approved',
                role: 'supplier' // ensure role
            } 
        }
    );
    console.log("✅ Supplier approved.");
    supplier = await suppliers.findOne({ email });
  }

  /* ---------------- SETUP CATEGORY ---------------- */
  const categories = db.collection('categories');
  const catName = "Vegetables";
  let category = await categories.findOne({ name: { $regex: new RegExp(`^${catName}$`, 'i') } });

  if (!category) {
    console.log(`⚠️ Category '${catName}' not found. Creating...`);
    const newCat = {
        name: catName,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    const res = await categories.insertOne(newCat);
    category = { _id: res.insertedId, ...newCat };
    console.log("✅ Category created.");
  }
  console.log(`📂 Category: ${category.name} (${category._id})`);

  /* ---------------- GENERATE TOKEN ---------------- */
  const payload = {
    id: supplier._id.toString(),
    role: supplier.role || 'supplier'
  };

  const secret = process.env.JWT_ACCESS_SECRET || 'farmferry@1234';
  const token = jwt.sign(payload, secret, { expiresIn: '1d' });
  console.log("\n🔑 JWT Token Generated");

  /* ---------------- GENERATE EXCEL ---------------- */
  console.log("\n📄 Generating Excel file...");
  const data = [
    { Name: "Test Tomato", Price: 50, Category: "Vegetables", Description: "Fresh Test Tomato", Stock: 100, Unit: "kg" },
    { Name: "Test Potato", Price: 30, Category: "Vegetables", Description: "Organic Test Potato", Stock: 200, Unit: "kg" },
    { Name: "Test Onion", Price: 40, Category: "Vegetables", Description: "Red Test Onion", Stock: 150, Unit: "kg" }
  ];

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");

  const filePath = path.join(rootDir, 'test_products.xlsx');
  XLSX.writeFile(wb, filePath);
  console.log(`✅ Excel file saved to: ${filePath}`);

  /* ---------------- OUTPUT FOR CURL ---------------- */
  console.log("\n📋 Use this Token for Testing:");
  console.log(token);
  
  // Also write token to a file for easy access
  fs.writeFileSync(path.join(rootDir, 'test_token.txt'), token);
  
  await mongoose.disconnect();
}

setup().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
