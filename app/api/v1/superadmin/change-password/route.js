import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import SuperAdmin from '@/models/SuperAdmin';
import { authenticate } from '@/middlewares/auth.middleware';
import { corsHandler } from '@/utils/corsHandler';
import bcrypt from 'bcryptjs';

export async function OPTIONS(req) {
  return new Response(null, {
    status: 204,
    headers: corsHandler(req),
  });
}

export async function PUT(req) {
    try {
        await dbConnect();
        
        // Auth check
        const authResult = await authenticate(req);
        if (!authResult.success) {
            return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.statusCode });
        }
        
        if (authResult.role !== 'superadmin') {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }

        const user = authResult.user;
        const { currentPassword, newPassword, confirmPassword } = await req.json();

        if (!currentPassword || !newPassword || !confirmPassword) {
            return NextResponse.json({ success: false, error: 'All fields are required' }, { status: 400 });
        }

        if (newPassword !== confirmPassword) {
            return NextResponse.json({ success: false, error: 'New passwords do not match' }, { status: 400 });
        }

        // Check current password
        // Since we excluded password in authenticate (or maybe not), let's fetch with password
        const superAdminWithPass = await SuperAdmin.findById(user._id).select('+password');
        
        const isMatch = await bcrypt.compare(currentPassword, superAdminWithPass.password);
        if (!isMatch) {
            return NextResponse.json({ success: false, error: 'Incorrect current password' }, { status: 400 });
        }

        // Update password
        // If the model has pre('save') hook for hashing, we should save document. 
        // If using findByIdAndUpdate, we need to hash manually.
        // Assuming pre-save hook based on common practice, but manual is safer if unsure or if using update.
        // Let's use direct save to trigger hooks if they exist, or manual hash if we use update.
        
        // Usually safer to manual hash if we are doing a specific password change endpoint
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await SuperAdmin.findByIdAndUpdate(user._id, { password: hashedPassword });

        return NextResponse.json({ 
            success: true, 
            message: "Password updated successfully" 
        });

    } catch (error) {
        console.error("Change password error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
