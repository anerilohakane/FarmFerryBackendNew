import { NextResponse } from "next/server";
import { authenticateDeliveryAssociate } from "@/middlewares/auth.middleware";
import dbConnect from "@/lib/connectDB";
import Notification from "@/models/Notification";

export async function GET(req) {
  try {
    await dbConnect();
    const authResult = await authenticateDeliveryAssociate(req);
    if (!authResult.success) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.statusCode });
    }

    const daId = authResult.user._id;

    // Fetch unread notifications or last 50
    const notifications = await Notification.find({
        recipient: daId,
        recipientType: 'deliveryAssociate'
    }).sort({ createdAt: -1 }).limit(50);

    return NextResponse.json({
      success: true,
      data: {
        notifications
      }
    });

  } catch (error) {
    console.error("Fetch Notifications Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req) {
    try {
        await dbConnect();
        const authResult = await authenticateDeliveryAssociate(req);
        if (!authResult.success) {
            return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.statusCode });
        }

        const { notificationId } = await req.json();

        if (!notificationId) {
             // Mark all as read if no ID provided? Or error. Let's support mark specific.
             return NextResponse.json({ success: false, message: "Notification ID required" }, { status: 400 });
        }

        await Notification.findByIdAndUpdate(notificationId, { isRead: true });

        return NextResponse.json({
            success: true,
            message: "Notification marked as read"
        });

    } catch (error) {
        console.error("Update Notification Error:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
