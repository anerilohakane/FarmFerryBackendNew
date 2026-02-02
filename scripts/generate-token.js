
// scripts/generate-token.js
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Hardcoded from .env.local because I can't load env vars easily in script
const MONGODB_URI = "mongodb+srv://aneridelxn_db_user:YhZGkF6u2pEeVyvJ@farmferry-db.11sfqjg.mongodb.net/farmferry_data?retryWrites=true&w=majority";
const JWT_SECRET = "farmferry@1234";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to DB");

    // Supplier Schema (Simplified for finding)
    const SupplierSchema = new mongoose.Schema({}, { strict: false });
    const Supplier = mongoose.models.Supplier || mongoose.model('Supplier', SupplierSchema);

    // Find any supplier
    let supplier = await Supplier.findOne({});
    
    if (!supplier) {
      console.log("No supplier found, creating dummy...");
      supplier = await Supplier.create({
        email: "test_supplier_" + Date.now() + "@test.com",
        password: "hashedpassword",
        status: "active",
        role: "supplier",
        businessName: "Test Supplier"
      });
    }

    console.log("Using Supplier:", supplier._id);

    // Generate Token
    const token = jwt.sign(
      { id: supplier._id, role: 'supplier' },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    const fs = require('fs');
    fs.writeFileSync('token.txt', token);
    console.log("Token saved to token.txt");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
