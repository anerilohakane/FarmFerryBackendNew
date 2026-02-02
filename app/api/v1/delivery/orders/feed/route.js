import { NextResponse } from "next/server";
import { authenticateDeliveryAssociate } from "@/middlewares/auth.middleware";
import Order from "@/models/Order";
import dbConnect from "@/lib/connectDB";

export async function GET(req) {
  try {
    await dbConnect();
    
    // 1. Authenticate Request
    const authResult = await authenticateDeliveryAssociate(req);
    if (!authResult.success) {
        return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.statusCode });
    }

    // 2. Find Available Orders
    // Criteria: Status is pending/packaging AND NOT assigned to anyone
    const query = {
        status: { $in: ["pending", "packaging"] },
        $or: [
            { "deliveryAssociate": { $exists: false } }, // Field missing
            { "deliveryAssociate.associate": null }      // Field explicitly null
        ]
    };

    const orders = await Order.find(query)
        .populate("customer", "firstName lastName address phone")
        .select("orderId deliveryAddress items totalAmount status createdAt paymentMethod")
        .sort({ createdAt: -1 });

    return NextResponse.json({
        success: true,
        count: orders.length,
        data: orders
    });

  } catch (error) {
    console.error("Fetch Available Orders Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
