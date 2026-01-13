import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import SuperAdmin from '@/models/SuperAdmin';
import { authenticate } from '@/middlewares/auth.middleware';
import { corsHandler } from '@/utils/corsHandler';
import cloudinary from '@/lib/cloudinary';

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

        // Parse FormData for image upload
        const formData = await req.formData();
        const imageFile = formData.get('avatar');
        
        if (!imageFile) {
             return NextResponse.json({ success: false, error: "No image file provided" }, { status: 400 });
        }

        // Upload to Cloudinary
        let avatarUrl = user.avatar; 
        
        if (imageFile && typeof imageFile !== 'string') {
             const arrayBuffer = await imageFile.arrayBuffer();
             const buffer = Buffer.from(arrayBuffer);
             const fileBase64 = `data:${imageFile.type};base64,${buffer.toString('base64')}`;

             const uploadResponse = await new Promise((resolve, reject) => {
                 cloudinary.uploader.upload(fileBase64, {
                     folder: "superadmins",
                     resource_type: "image"
                 }, (error, result) => {
                     if (error) reject(error);
                     else resolve(result);
                 });
             });
             avatarUrl = uploadResponse.secure_url;
        }

        // Update superadmin
        const updatedAdmin = await SuperAdmin.findByIdAndUpdate(
            user._id, 
            { avatar: avatarUrl },
            { new: true }
        ).select('-password');

        return NextResponse.json({ 
            success: true, 
            data: updatedAdmin,
            message: "Avatar updated successfully" 
        });

    } catch (error) {
        console.error("Update avatar error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
