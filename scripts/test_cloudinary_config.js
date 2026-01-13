
const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: '.env.local' });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testUpload() {
  console.log("Checking Cloudinary Config...");
  console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME ? "Set" : "Missing");
  console.log("API Key:", process.env.CLOUDINARY_API_KEY ? "Set" : "Missing");
  console.log("API Secret:", process.env.CLOUDINARY_API_SECRET ? "Set" : "Missing");

  try {
    console.log("Attempting to upload a test image...");
    // Upload a sample image from a public URL
    const result = await cloudinary.uploader.upload("https://res.cloudinary.com/demo/image/upload/sample.jpg", {
        folder: "test_upload"
    });
    console.log("✅ Upload Successful!");
    console.log("Image URL:", result.secure_url);
  } catch (error) {
    console.error("❌ Upload Failed!");
    console.error("Error Details:", error);
  }
}

testUpload();
