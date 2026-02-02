import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Notification from "@/models/Notification";
import { authenticateSupplier } from "@/middlewares/auth.middleware";

// GET: Fetch notifications
export async function GET(request) {
  try {
    await dbConnect();

    /* ------------------ AUTH ------------------ */
    const authResult = await authenticateSupplier(request);

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const supplier = authResult.user;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    const query = {
      recipient: supplier._id,
      recipientType: "supplier"
    };

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ ...query, isRead: false });

    return NextResponse.json({
      success: true,
      message: "Notifications fetched successfully",
      data: {
        notifications,
        unreadCount,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error("GET Notifications Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH: Mark as read
export async function PATCH(request) {
  try {
    await dbConnect();

    /* ------------------ AUTH ------------------ */
    const authResult = await authenticateSupplier(request);

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const supplier = authResult.user;
    const body = await request.json();
    const { notificationId, markAllRead } = body;

    const query = {
      recipient: supplier._id,
      recipientType: "supplier"
    };

    if (markAllRead) {
      await Notification.updateMany(
        { ...query, isRead: false },
        { $set: { isRead: true } }
      );
      
      return NextResponse.json({
        success: true,
        message: "All notifications marked as read"
      });
    }

    if (notificationId) {
      const notification = await Notification.findOne({
        _id: notificationId,
        ...query
      });

      if (!notification) {
        return NextResponse.json(
          { success: false, message: "Notification not found" },
          { status: 404 }
        );
      }

      notification.isRead = true;
      await notification.save();

      return NextResponse.json({
        success: true,
        message: "Notification marked as read"
      });
    }

    return NextResponse.json(
      { success: false, message: "Notification ID or markAllRead required" },
      { status: 400 }
    );

  } catch (error) {
    console.error("PATCH Notifications Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
