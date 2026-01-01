import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/connectDB";
import Order from "@/models/Order";
import { verifyJWT } from "@/middlewares/auth.middleware";

export async function GET(req, context) {
  try {
    await dbConnect();
    await verifyJWT(req);

    const { id } = await context.params;

    // 🛡️ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid order ID" },
        { status: 400 }
      );
    }

    const order = await Order.findById(id)
      .populate("items.product supplier customer");

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}


export async function PATCH(req, context) {
  try {
    await dbConnect();
    const user = await verifyJWT(req);

    // ✅ UNWRAP params
    const { id } = await context.params;

    // 🛡️ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid order ID" },
        { status: 400 }
      );
    }

    const { status, note } = await req.json();

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    order.status = status;
    order.statusHistory.push({
      status,
      updatedBy: user._id,
      updatedByModel: "Supplier",
      note
    });

    await order.save();

    return NextResponse.json({
      success: true,
      message: "Order status updated",
      order
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}



