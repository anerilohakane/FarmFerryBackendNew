import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function upload() {
    const tokenPath = path.join(rootDir, 'test_token.txt');
    if (!fs.existsSync(tokenPath)) {
        console.error("❌ Token file not found. Run setup first.");
        process.exit(1);
    }
    const token = fs.readFileSync(tokenPath, 'utf8').trim();

    const filePath = path.join(rootDir, 'test_products.xlsx');
    if (!fs.existsSync(filePath)) {
        console.error("❌ Excel file not found. Run setup first.");
        process.exit(1);
    }

    // Read file as Blob (Node 20+)
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const formData = new FormData();
    formData.append('file', blob, 'test_products.xlsx');

    console.log("🚀 Sending POST request to bulk-upload...");
    try {
        const response = await fetch('http://localhost:3000/api/v1/supplier/products/bulk-upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // 'Content-Type': 'multipart/form-data' // Let fetch set boundary!
            },
            body: formData
        });

        console.log(`📡 Status: ${response.status} ${response.statusText}`);
        const result = await response.json();
        console.log("📄 Response:", JSON.stringify(result, null, 2));

        if (!response.ok) process.exit(1);

    } catch (error) {
        console.error("💥 Error:", error);
        process.exit(1);
    }
}

upload();
