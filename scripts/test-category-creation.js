
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Env vars (hardcoded based on .env.local)
const MONGODB_URI = "mongodb+srv://aneridelxn_db_user:YhZGkF6u2pEeVyvJ@farmferry-db.11sfqjg.mongodb.net/farmferry_data?retryWrites=true&w=majority";
const JWT_SECRET = "farmferry@1234";

async function run() {
  try {
    // 1. Get Admin Token
    console.log("🔌 Connecting to DB...");
    await mongoose.connect(MONGODB_URI);
    
    // Admin Model (simplified)
    const AdminSchema = new mongoose.Schema({}, { strict: false });
    const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
    
    let admin = await Admin.findOne({ role: { $in: ['admin', 'superadmin'] } });
    if (!admin) {
      console.log("creating dummy admin");
      admin = await Admin.create({
        email: `admin_${Date.now()}@test.com`,
        password: "hashed",
        role: "admin",
        firstName: "Test",
        lastName: "Admin"
      });
    }
    
    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log("🔑 Generated Admin Token");
    
    // 2. Prepare FormData
    // Create a dummy image file (valid 1x1 GIF)
    const dummyImagePath = path.join(__dirname, 'dummy.gif');
    const minimalGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    fs.writeFileSync(dummyImagePath, minimalGif);
    
    const { Blob } = require('buffer');
    const fileBuffer = fs.readFileSync(dummyImagePath);
    const fileBlob = new Blob([fileBuffer], { type: 'image/gif' });
    
    const formData = new FormData();
    const catName = `Test Category ${Date.now()}`;
    formData.append('name', catName);
    formData.append('description', 'Test Description via Script');
    formData.append('isActive', 'true');
    formData.append('image', fileBlob, 'dummy.gif');
    
    console.log(`🚀 Testing Category Creation: ${catName}`);
    
    // 3. Send Request
    const response = await fetch('http://localhost:3001/api/v1/category', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
            // Content-Type is set automatically with boundary by fetch for FormData
        },
        body: formData
    });
    
    const data = await response.json();
    
    console.log(`📡 Status: ${response.status}`);
    console.log('📄 Response:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.success) {
        console.log("✅ TEST PASSED: Category created with FormData");
    } else {
        console.log("❌ TEST FAILED");
    }
    
    // Clean up
    if (fs.existsSync(dummyImagePath)) fs.unlinkSync(dummyImagePath);
    process.exit(0);
    
  } catch (error) {
    console.error("❌ ERROR:", error);
    process.exit(1);
  }
}

run();
