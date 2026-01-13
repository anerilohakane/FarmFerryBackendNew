import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import Admin from '@/models/Admin';
import { authenticate } from '@/middlewares/auth.middleware';
import { corsHandler } from '@/utils/corsHandler';

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
        const user = authResult.user;

        // Parse FormData for image upload
        const formData = await req.formData();
        const file = formData.get('avatar');
        
        // Mock URL response since we don't have real upload
        // In real app: upload to S3/Cloudinary here.
        const avatarUrl = "https://via.placeholder.com/150"; 
        
        // Update admin
        await Admin.findByIdAndUpdate(user._id, { avatar: avatarUrl });

        return NextResponse.json({ success: true, data: { avatar: avatarUrl, message: "Avatar updated" } });

    } catch (error) {
        console.error("Update avatar error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
