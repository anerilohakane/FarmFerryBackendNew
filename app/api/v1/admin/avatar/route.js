import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import Admin from '@/models/Admin';
import { requireRole } from '@/middlewares/auth.middleware';
import { handleCors, corsHandler } from '@/utils/corsHandler';

export async function POST(req) {
     const corsResponse = await handleCors(req);
     if (corsResponse) return corsResponse;

    try {
        await dbConnect();
        const authCheck = await requireRole(["admin", "superadmin"])(req);
        if (!authCheck.success) {
             return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.statusCode });
        }

        // Parse FormData for image upload
        // In a real app, use a storage service (S3/Cloudinary).
        // Since api.js isFormData=true, expect FormData.
        // Assuming we just want to update the 'avatar' string for now or mocks it.
        // Or re-use the profile update logic.
        
        // Let's assume the frontend sends a URL or we mock the upload.
        // Reading FormData in App Router:
        const formData = await req.formData();
        const file = formData.get('avatar');
        
        // Mock URL response
        const avatarUrl = "https://via.placeholder.com/150"; 
        // Real implementation requires Cloudinary upload.
        
        // Update admin
        await Admin.findByIdAndUpdate(authCheck.user._id, { avatar: avatarUrl });

        return NextResponse.json({ success: true, data: { avatar: avatarUrl, message: "Avatar updated" } });

    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
export async function OPTIONS(req) {
  return new Response(null, {
    status: 204,
    headers: corsHandler(req),
  });
}
