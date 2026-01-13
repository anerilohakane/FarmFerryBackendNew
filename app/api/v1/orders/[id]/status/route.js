import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/connectDB";
import Order from "@/models/Order";
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
