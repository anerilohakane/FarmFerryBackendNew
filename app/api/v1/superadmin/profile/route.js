import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import SuperAdmin from '@/models/SuperAdmin';
import { authenticate } from "@/middlewares/auth.middleware";
import { corsHandler } from "@/utils/corsHandler";

export async function OPTIONS(req) {
  return new Response(null, {
    status: 204,
    headers: corsHandler(req),
  });
}

// GET - Get superadmin profile
export async function GET(req) {
  try {
    await dbConnect();
    const authResult = await authenticate(req);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.statusCode });
    }

    if (authResult.role !== 'superadmin') {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Since authenticate returns the user, we can just return it
    // But let's fetch fresh to be safe, or just return authResult.user
    const superAdmin = await SuperAdmin.findById(authResult.user._id).select('-password');

    return NextResponse.json({
      success: true,
      data: superAdmin
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update superadmin profile
export async function PUT(req) {
  try {
    await dbConnect();
    const authResult = await authenticate(req);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.statusCode });
    }

    if (authResult.role !== 'superadmin') {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { name, email, phone } = await req.json();

    const updatedAdmin = await SuperAdmin.findByIdAndUpdate(
      authResult.user._id,
      { name, email, phone },
      { new: true, runValidators: true }
    ).select('-password');

    return NextResponse.json({
      success: true,
      data: updatedAdmin,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
