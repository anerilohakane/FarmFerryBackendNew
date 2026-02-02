
import { NextResponse } from "next/server";
import { authenticateDeliveryAssociate } from "@/middlewares/auth.middleware";
import Order from "@/models/Order";
import dbConnect from "@/lib/connectDB";

export async function GET(req) {
  try {
    await dbConnect();
    
    const authResult = await authenticateDeliveryAssociate(req);
    if (!authResult.success) {
        return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.statusCode });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status'); // e.g., 'active' or 'history'

    const query = {
        "deliveryAssociate.associate": authResult.user._id
    };

    if (statusFilter === 'active') {
        query["deliveryAssociate.status"] = { $in: ["assigned", "out_for_delivery"] };
    } else if (statusFilter === 'history') {
        query["deliveryAssociate.status"] = { $in: ["delivered", "failed"] };
    }

    const orders = await Order.find(query)
        .populate("customer", "firstName lastName phone address") 
        // Note: Customer address in Order is usually copied to 'deliveryAddress' field
        .select("orderId deliveryAddress status deliveryAssociate totalAmount paymentMethod createdAt")
        .sort({ createdAt: -1 });

    return NextResponse.json({
        success: true,
        count: orders.length,
        data: orders
    });

  } catch (error) {
    console.error("Delivery Orders List Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
