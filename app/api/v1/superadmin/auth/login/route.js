import SuperAdmin from '@/models/SuperAdmin';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/connectDB';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this';

// POST method for login
export async function POST(req) {
  await dbConnect();

  try {
    // Parse JSON body from request
    const body = await req.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return Response.json({ 
        success: false,
        message: 'Email and password are required' 
      }, { status: 400 });
    }

    // Find super admin by email
    const superAdmin = await SuperAdmin.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (!superAdmin) {
      return Response.json({ 
        success: false,
        message: 'Invalid email or password' 
      }, { status: 401 });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, superAdmin.password);
    if (!isPasswordValid) {
      return Response.json({ 
        success: false,
        message: 'Invalid email or password' 
      }, { status: 401 });
    }

    // Update last login
    superAdmin.lastLogin = new Date();
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
      message: 'Login successful',
      token,
      data: superAdminData
    }, { status: 200 });

  } catch (error) {
    console.error('Login error:', error);
    
    return Response.json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// For compatibility with older Next.js versions
export default async function handler(req, res) {
  if (req.method === 'POST') {
    return await POST(req);
  }
  
  return res.status(405).json({ 
    success: false,
    message: 'Method not allowed' 
  });
}