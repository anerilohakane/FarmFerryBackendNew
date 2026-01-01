import SuperAdmin from '@/models/SuperAdmin';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/connectDB';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this';

// POST method handler
export async function POST(req) {
  await dbConnect();

  try {
    // Parse JSON body from request
    const body = await req.json();
    const { name, email, password, avatar, phone, location, company } = body;

    // Validate required fields
    if (!name || !email || !password) {
      return Response.json({ 
        success: false,
        message: 'Name, email, and password are required' 
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json({ 
        success: false,
        message: 'Invalid email format' 
      }, { status: 400 });
    }

    // Check if super admin already exists
    const existingAdmin = await SuperAdmin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return Response.json({ 
        success: false,
        message: 'Super admin with this email already exists' 
      }, { status: 409 });
    }

    // Validate password strength
    if (password.length < 6) {
      return Response.json({ 
        success: false,
        message: 'Password must be at least 6 characters long' 
      }, { status: 400 });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new super admin
    const superAdmin = new SuperAdmin({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      avatar: avatar || '',
      phone: phone || '',
      location: location || '',
      company: company || ''
    });

    await superAdmin.save();

    // Create JWT token
    const token = jwt.sign(
      { 
        id: superAdmin._id.toString(), 
        email: superAdmin.email,
        role: 'superadmin',
        name: superAdmin.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Prepare response data
    const superAdminData = {
      _id: superAdmin._id,
      name: superAdmin.name,
      email: superAdmin.email,
      avatar: superAdmin.avatar,
      phone: superAdmin.phone,
      location: superAdmin.location,
      company: superAdmin.company,
      lastLogin: superAdmin.lastLogin,
      createdAt: superAdmin.createdAt,
      updatedAt: superAdmin.updatedAt
    };

    return Response.json({
      success: true,
      message: 'Super admin registered successfully',
      token,
      data: superAdminData
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return Response.json({ 
        success: false,
        message: 'Email already exists' 
      }, { status: 409 });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return Response.json({ 
        success: false,
        message: 'Validation failed',
        errors 
      }, { status: 400 });
    }

    return Response.json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// For compatibility with older Next.js versions, you can also export handler
export default async function handler(req, res) {
  if (req.method === 'POST') {
    return await POST(req);
  }
  
  return res.status(405).json({ 
    success: false,
    message: 'Method not allowed' 
  });
}