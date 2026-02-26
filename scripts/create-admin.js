
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://aneridelxn_db_user:YhZGkF6u2pEeVyvJ@farmferry-db.11sfqjg.mongodb.net/farmferry_data?retryWrites=true&w=majority";

async function createAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("🔌 Connected to DB");

    // Define minimal Admin schema if model not loaded
    const AdminSchema = new mongoose.Schema({
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: { type: String, enum: ["admin", "superadmin"], default: "admin" },
        createdAt: { type: Date, default: Date.now }
    });
    
    const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

    const email = "admin@farmferry.com";
    const password = "password123";
    const hashedPassword = await bcrypt.hash(password, 10);

    const existing = await Admin.findOne({ email });
    if (existing) {
        console.log(`⚠️ Admin already exists: ${email}`);
        console.log(`Resetting password to: ${password}`);
        existing.password = hashedPassword;
        existing.role = "admin"; // Force role to admin to match collection
        await existing.save();
        console.log("✅ Password and role updated.");
    } else {
        await Admin.create({
            firstName: "Super",
            lastName: "Admin",
            email,
            password: hashedPassword,
            role: "admin" // Create as admin
        });
        console.log(`✅ Admin created: ${email} / ${password}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createAdmin();
