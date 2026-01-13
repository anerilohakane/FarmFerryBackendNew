import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/connectDB";
import Order from "@/models/Order";
import DeliveryAssociate from "@/models/DeliveryAssociate";
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

    // Only Admin can assign for now (or maybe Supplier?)
    if (authResult.role !== 'admin' && authResult.role !== 'supplier') {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await context.params;
    
    // Validate Order ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid order ID" }, { status: 400 });
    }

    const { deliveryAssociateId } = await req.json();

    if (!deliveryAssociateId) {
        return NextResponse.json({ success: false, message: "Delivery Associate ID is required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(deliveryAssociateId)) {
        return NextResponse.json({ success: false, message: "Invalid Delivery Associate ID" }, { status: 400 });
    }

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    const da = await DeliveryAssociate.findById(deliveryAssociateId);
    if (!da) {
        return NextResponse.json({ success: false, message: "Delivery Associate not found" }, { status: 404 });
    }

    order.deliveryAssociate = {
        associate: da._id,
        name: da.name || da.fullName, 
        assignedAt: new Date(),
        status: "assigned"
    };

    // Update status history
    order.statusHistory.push({
      status: order.status, // Status might not change, or maybe move to 'processing' or 'out_for_delivery'? 
      // Usually assigning DA doesn't immediately change order status unless specified.
      // But it updates the 'delivery' status logic.
      updatedBy: user._id,
      updatedByModel: authResult.role === 'admin' ? 'Admin' : 'Supplier',
      note: `Assigned to ${da.name}`
    });

    await order.save();

    return NextResponse.json({
      success: true,
      message: "Delivery Associate assigned",
      data: { order }
    });
  } catch (error) {
    console.error("Assign DA error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
