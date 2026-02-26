import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import Notification from '@/models/Notification';
import { authenticate } from '@/middlewares/auth.middleware';
import { corsHandler } from '@/utils/corsHandler';

export async function OPTIONS(req) {
  return new Response(null, {
    status: 204,
    headers: corsHandler(req),
  });
}

// GET: Fetch unread notifications for superadmin
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

        // Fetch unread notifications for admin
        const notifications = await Notification.find({
            recipientType: 'admin',
            isRead: false
        }).sort({ createdAt: -1 }).limit(50);

        return NextResponse.json({ 
            success: true, 
            data: notifications 
        });

    } catch (error) {
        console.error("Get notifications error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

// PATCH: Mark notification as read
export async function PATCH(req) {
    try {
        await dbConnect();
        
        const authResult = await authenticate(req);
        if (!authResult.success) {
            return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.statusCode });
        }
        
        if (authResult.role !== 'superadmin') {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }

        const { id, markAll } = await req.json();

        if (markAll) {
             await Notification.updateMany(
                { recipientType: 'admin', isRead: false },
                { isRead: true }
             );
             return NextResponse.json({ success: true, message: "All notifications marked as read" });
        }

        if (id) {
            await Notification.findByIdAndUpdate(id, { isRead: true });
            return NextResponse.json({ success: true, message: "Notification marked as read" });
        }

        return NextResponse.json({ success: false, error: "Missing id or markAll flag" }, { status: 400 });

    } catch (error) {
        console.error("Update notification error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
