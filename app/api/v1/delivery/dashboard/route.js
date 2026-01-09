
import { NextResponse } from "next/server";
import { authenticateDeliveryAssociate } from "@/middlewares/auth.middleware";
import Order from "@/models/Order";
import DeliveryAssociate from "@/models/DeliveryAssociate";
import dbConnect from "@/lib/connectDB";

export async function GET(req) {
  try {
    await dbConnect();

    // 1. Auth
    const authResult = await authenticateDeliveryAssociate(req);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.statusCode }
      );
    }
    
    const deliveryAssociate = authResult.user;
    const daId = deliveryAssociate._id;

    // 2. Counts
    const activeOrders = await Order.countDocuments({
      "deliveryAssociate.associate": daId,
      "deliveryAssociate.status": { $in: ["assigned", "out_for_delivery"] }
    });

    const completedToday = await Order.countDocuments({
      "deliveryAssociate.associate": daId,
      "deliveryAssociate.status": "delivered",
      deliveredAt: { 
        $gte: new Date(new Date().setHours(0,0,0,0)), 
        $lte: new Date(new Date().setHours(23,59,59,999)) 
      }
    });

    // 3. Earnings (Mock Logic: 50 per order)
    // In a real app, this would come from a Wallet/Transaction model
    const FIXED_RATE = 20; 
    const todayEarnings = completedToday * FIXED_RATE;

    // 4. Response
    return NextResponse.json({
      success: true,
      data: {
        profile: {
          name: deliveryAssociate.name,
          isOnline: deliveryAssociate.isOnline,
          rating: deliveryAssociate.averageRating
        },
        stats: {
          activeOrders,
          completedToday,
          todayEarnings,
          totalDeliveries: deliveryAssociate.completedDeliveries
        }
      }
    });

  } catch (error) {
    console.error("Delivery Dashboard Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
