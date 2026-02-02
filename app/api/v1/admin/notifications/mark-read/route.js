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

// PUT - Mark all or specific notifications as read
export async function PUT(req) {
  try {
    await dbConnect();
    const authResult = await authenticate(req);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.statusCode });
    }

    const { notificationIds, markAll } = await req.json();

    if (markAll) {
        // Mark all admin notifications as read
        await Notification.updateMany(
            { recipientType: 'admin', isRead: false },
            { $set: { isRead: true } }
        );
    } else if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
        await Notification.updateMany(
            { _id: { $in: notificationIds }, recipientType: 'admin' },
            { $set: { isRead: true } }
        );
    }

    return NextResponse.json({
      success: true,
      message: "Notifications marked as read"
    });

  } catch (error) {
    console.error('Mark read error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
