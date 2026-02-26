import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import dbConnect from '../lib/connectDB.js';
import Customer from '../models/Customer.js';

console.log('Testing Model Loading...');

async function test() {
  try {
    console.log('Connecting to DB...');
    await dbConnect();
    console.log('DB Connected');
    
    // Try to count customers
    const count = await Customer.countDocuments();
    console.log('Customer Count:', count);
    
    console.log('Success');
    if (process.env.exit !== 'no') process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

test();
