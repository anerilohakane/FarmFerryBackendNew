// import dotenv from 'dotenv'; // Not using package
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
             const key = parts[0].trim();
             const value = parts.slice(1).join('=').trim();
             process.env[key] = value;
        }
    });
    console.log('Loaded .env.local');
} 

import dbConnect from '../lib/connectDB.js';
import SuperAdmin from '../models/SuperAdmin.js';
import jwt from 'jsonwebtoken';

async function test() {
    try {
        console.log('Connecting to DB...');
        await dbConnect();
        console.log('Connected.');

        console.log('Testing SuperAdmin Model...');
        const count = await SuperAdmin.countDocuments();
        console.log('SuperAdmins count:', count);

        const email = 'superadmin_test@farmferry.com';
        const user = await SuperAdmin.findOne({ email });
        console.log('Found User:', user ? user.email : 'No');

        // Test JWT Logic
        console.log('Testing JWT Sign...');
        const secret = process.env.JWT_SECRET || "farmferry_super_secret_key_2026";
        const token = jwt.sign({ foo: 'bar' }, secret);
        console.log('Token created:', token ? 'Yes' : 'No');

        process.exit(0);
    } catch (e) {
        console.error('Test Failed:', e);
        process.exit(1);
    }
}

test();
