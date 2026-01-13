import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/connectDB";
import Order from "@/models/Order";
import Notification from "@/models/Notification";
import Admin from "@/models/Admin";
import { authenticate } from "@/middlewares/auth.middleware";
import { corsHandler } from "@/utils/corsHandler";

export async function OPTIONS(req) {
  return new Response(null, {
    status: 204,
    headers: corsHandler(req),
  });
}

export async function PUT(req, context) {
  try {
    await dbConnect();
    const authResult = await authenticate(req);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.statusCode });
    }
    const user = authResult.user;

    const { id } = await context.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid order ID" }, { status: 400 });
    }

    const { status, note } = await req.json();

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    order.status = status;
    order.statusHistory.push({
      status,
      updatedBy: user._id,
      updatedByModel: authResult.role === 'admin' ? 'Admin' : 'Supplier', // Simple logic
      note
    });

    await order.save();

    // 🔔 Notify Admin for Important Status Changes (Return/Cancelled)
    if (['returned', 'cancelled', 'return_requested'].includes(status)) {
        try {
            await Notification.create({
                recipient: null, // Broadcast to all admins
                recipientType: 'admin',
                title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                message: `Order #${order._id.toString().slice(-6)} has been marked as ${status}.`,
                type: 'order_status_update',
                referenceId: order._id
            });
        } catch (notifError) {
            console.error("Notification trigger failed:", notifError);
            // Don't fail the request if notification fails
        }
    }

    return NextResponse.json({
      success: true,
      message: "Order status updated",
      data: { order }
    });
  } catch (error) {
    console.error("Update status error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
