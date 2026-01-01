import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Admin from '@/models/Admin';

// GET - Get admin profile
export async function GET(req) {
  try {
    
    await dbConnect();
    
    const admin = await Admin.findById(user.id).select("-password -passwordResetToken -passwordResetExpires");
    
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Admin not found" },
        { status: 404 }
      );
    }
    
    // Add joinDate to response
    const adminObj = admin.toObject();
    adminObj.joinDate = admin.createdAt;
    
    return NextResponse.json(
      {
        success: true,
        data: { admin: adminObj },
        message: "Admin profile fetched successfully"
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Get admin profile error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update admin profile
export async function PUT(req) {
  try {
    
    await dbConnect();
    
    const body = await req.json();
    const { name, phone, location, company, avatar, notificationPreferences } = body;
    
    const updateFields = {};
    
    if (name) updateFields.name = name;
    if (phone) updateFields.phone = phone;
    if (location) updateFields.location = location;
    if (company) updateFields.company = company;
    if (avatar) updateFields.avatar = avatar;
    if (notificationPreferences) updateFields.notificationPreferences = notificationPreferences;
    
    const updatedAdmin = await Admin.findByIdAndUpdate(
      user.id,
      { $set: updateFields },
      { new: true }
    ).select("-password -passwordResetToken -passwordResetExpires");
    
    if (!updatedAdmin) {
      return NextResponse.json(
        { success: false, message: "Admin not found" },
        { status: 404 }
      );
    }
    
    // Add joinDate to response
    const adminObj = updatedAdmin.toObject();
    adminObj.joinDate = updatedAdmin.createdAt;
    
    return NextResponse.json(
      {
        success: true,
        data: { admin: adminObj },
        message: "Admin profile updated successfully"
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Update admin profile error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}