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
        console.log("Avatar Upload: Request Received");
        await dbConnect();
        
        // Auth check
        const authResult = await authenticate(req);
        if (!authResult.success) {
            console.log("Avatar Upload: Auth Failed", authResult.error);
            return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.statusCode });
        }
        
        if (authResult.role !== 'superadmin') {
            console.log("Avatar Upload: Role mismatch", authResult.role);
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }

        const user = authResult.user;

        // Parse FormData
        let formData;
        try {
            formData = await req.formData();
        } catch (e) {
            console.error("Avatar Upload: Failed to parse FormData", e);
            return NextResponse.json({ success: false, error: "Invalid form data" }, { status: 400 });
        }

        const imageFile = formData.get('avatar');
        
        if (!imageFile) {
             console.log("Avatar Upload: No file in 'avatar' field");
             return NextResponse.json({ success: false, error: "No image file provided" }, { status: 400 });
        }

        console.log("Avatar Upload: File received", imageFile.name, imageFile.type, imageFile.size);

        // Upload to Cloudinary
        let avatarUrl = user.avatar; 
        
        if (imageFile && typeof imageFile !== 'string') {
             console.log("Avatar Upload: Starting Cloudinary Upload...");
             const arrayBuffer = await imageFile.arrayBuffer();
             const buffer = Buffer.from(arrayBuffer);
             const fileBase64 = `data:${imageFile.type};base64,${buffer.toString('base64')}`;

             const uploadResponse = await new Promise((resolve, reject) => {
                 cloudinary.uploader.upload(fileBase64, {
                     folder: "superadmins",
                     resource_type: "image"
                 }, (error, result) => {
                     if (error) {
                         console.error("Avatar Upload: Cloudinary Error", error);
                         reject(error);
                     } else {
                         console.log("Avatar Upload: Cloudinary Success", result.secure_url);
                         resolve(result);
                     }
                 });
             });
             avatarUrl = uploadResponse.secure_url;
        }

        // Update superadmin
        console.log("Avatar Upload: Updating Database...");
        const updatedAdmin = await SuperAdmin.findByIdAndUpdate(
            user._id, 
            { avatar: avatarUrl },
            { new: true }
        ).select('-password');
        console.log("Avatar Upload: Complete");

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
