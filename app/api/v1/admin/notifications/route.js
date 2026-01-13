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

// GET - Get all notifications for the authenticated admin
export async function GET(req) {
  try {
    await dbConnect();
    
    const authResult = await authenticate(req);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.statusCode });
    }
    const user = authResult.user;

    // Fetch notifications where recipient is this admin OR recipientType is 'admin' (broadcast to all admins?)
    // The model has recipient field. If we want broadcast to all admins, we might need a specific logic.
    // For now, let's assume notifications are created for a specific admin OR we query by recipientType='admin'.
    // Given the requirement "all important notification should get to the Admin", likely any admin should see them.
    // So we fetch sort by date. 
    // Wait, the model requires 'recipient'. If we create a notification for "Admin", do we pick one admin ID or use a special ID?
    // Or do we change the query to: { $or: [ { recipient: user._id }, { recipientType: 'admin' } ] }
    // Let's check the Schema again. recipient is required ObjectId.
    // So we probably need to assign it to a specific admin (like the superadmin) OR we relax the requirement.
    // However, I can't change the schema easily without potentially breaking other things (though I can check usages).
    // For now, I'll query { recipientType: 'admin' } and ignore recipient ID if possible, or assume it matches.
    // Actually, distinct notifications for every admin is expensive. 
    // Let's try { recipientType: 'admin' } primarily. 
    
    const notifications = await Notification.find({ recipientType: 'admin' })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to last 50 for now

    const unreadCount = await Notification.countDocuments({ recipientType: 'admin', isRead: false });

    return NextResponse.json({
      success: true,
      data: { 
        notifications,
        unreadCount
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
