import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Admin from '@/models/Admin';

// PUT - Change admin password
export async function PUT(req) {
  try {
    
    await dbConnect();
    
    const body = await req.json();
    const { currentPassword, newPassword, confirmPassword } = body;
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, message: "All password fields are required" },
        { status: 400 }
      );
    }
    
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: "New passwords do not match" },
        { status: 400 }
      );
    }
    
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }
    
    const admin = await Admin.findById(user.id);
    
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Admin not found" },
        { status: 404 }
      );
    }
    
    const isMatch = await admin.isPasswordCorrect(currentPassword);
    
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Current password is incorrect" },
        { status: 400 }
      );
    }
    
    admin.password = newPassword;
    await admin.save();
    
    return NextResponse.json(
      {
        success: true,
        message: "Password updated successfully"
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}