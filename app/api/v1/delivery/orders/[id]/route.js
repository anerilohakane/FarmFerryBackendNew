
import { NextResponse } from "next/server";
import { authenticateDeliveryAssociate } from "@/middlewares/auth.middleware";
import Order from "@/models/Order";
import dbConnect from "@/lib/connectDB";

export async function GET(req, { params }) {
  try {
    await dbConnect();
    
    // Auth
    const authResult = await authenticateDeliveryAssociate(req);
    if (!authResult.success) {
        return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.statusCode });
    }

    const orderId = params.id;
    
    // Find Order (Ensure it is assigned to this DA)
    const order = await Order.findOne({
        _id: orderId,
        "deliveryAssociate.associate": authResult.user._id
    })
    .populate("customer", "firstName lastName phone")
    .populate("supplier", "businessName address phone");

    if (!order) {
        return NextResponse.json({ success: false, message: "Order not found or not assigned" }, { status: 404 });
    }

    return NextResponse.json({
        success: true,
        data: order
    });

  } catch (error) {
    console.error("Delivery Order Detail Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
