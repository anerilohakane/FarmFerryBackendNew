const mongoose = require('mongoose');

// Manually load env from .env.local if dotenv not available or just to be sure
const fs = require('fs');
const path = require('path');

try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
    console.log('Loaded .env.local');
    console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Exists' : 'Missing');
} catch (e) {
    console.log('Could not load .env.local', e.message);
}

// Mock Next.js environment?
// We need to use 'import' but we are in CommonJS script.
// Next.js uses ES modules.
// I cannot easily require the ESM files from here.
// I will create this as .mjs file.

console.log("Switching to .mjs...");
