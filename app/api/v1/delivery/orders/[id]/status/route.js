
import { NextResponse } from "next/server";
import { authenticateDeliveryAssociate } from "@/middlewares/auth.middleware";
import Order from "@/models/Order";
import dbConnect from "@/lib/connectDB";

export async function PATCH(req, props) {
  const params = await props.params;
  try {
    await dbConnect();
    
    const authResult = await authenticateDeliveryAssociate(req);
    if (!authResult.success) {
        return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.statusCode });
    }

    const orderId = params.id;
    const { status, otp, reason } = await req.json(); // status: out_for_delivery, delivered, failed

    // Check 1: Exists?
    const orderExists = await Order.findById(orderId);
    if (!orderExists) {
        return NextResponse.json({ success: false, message: `Order ID ${orderId} not found in DB` }, { status: 404 });
    }

    // Check 2: Assigned?
    if (orderExists.deliveryAssociate?.associate?.toString() !== authResult.user._id.toString()) {
         return NextResponse.json({ 
             success: false, 
             message: `Order not assigned to you. Order DA: ${orderExists.deliveryAssociate?.associate}, You: ${authResult.user._id}`
         }, { status: 403 });
    }

    const order = orderExists; // proceed

    if (status === "out_for_delivery") {
        order.deliveryAssociate.status = "out_for_delivery";
        order.status = "out_for_delivery";
        // Generate OTP
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        order.otp = generatedOtp; // In production, hash this!
        // TODO: Send OTP to Customer via SMS
        console.log(`[Mock SMS] OTP for Order ${orderId}: ${generatedOtp}`);
    } 
    else if (status === "delivered") {
        if (!otp) {
            return NextResponse.json({ success: false, message: "OTP is required" }, { status: 400 });
        }
        if (order.otp !== otp) {
            return NextResponse.json({ success: false, message: "Invalid OTP" }, { status: 400 });
        }
        
        order.deliveryAssociate.status = "delivered";
        order.status = "delivered";
        order.deliveredAt = new Date();
        
        if (order.paymentMethod === "cash_on_delivery") {
            order.paymentStatus = "paid";
        }
    }
    else if (status === "failed") {
        order.deliveryAssociate.status = "failed";
        // Order status might remain processing or move to returned depending on logic.
        // Usually, failed delivery attempt logic is complex.
        // For now, let's mark associate status as failed.
        order.notes = reason || "Delivery Attempt Failed";
    }
    else {
        return NextResponse.json({ success: false, message: "Invalid status" }, { status: 400 });
    }

    await order.save();

    return NextResponse.json({
        success: true,
        message: `Order status updated to ${status}`,
        data: order
    });

  } catch (error) {
    console.error("Delivery Status Update Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
