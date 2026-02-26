import { NextResponse } from "next/server";
import { authenticateDeliveryAssociate } from "@/middlewares/auth.middleware";
import dbConnect from "@/lib/connectDB";
import Order from "@/models/Order";
import DeliveryAssociate from "@/models/DeliveryAssociate";

export async function GET(req) {
  try {
    await dbConnect();
    const authResult = await authenticateDeliveryAssociate(req);
    if (!authResult.success) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.statusCode });
    }
    
    const daId = authResult.user._id;
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'weekly';

    // Calculate Weekly Earnings
    const today = new Date();
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Rate per order
    const RATE_PER_ORDER = 20;

    // Find orders delivered by this DA in this period
    const orders = await Order.find({
        "deliveryAssociate.associate": daId,
        "deliveryAssociate.status": "delivered", // or just check order status 'delivered'
        deliveredAt: { $gte: startOfWeek, $lte: endOfWeek }
    }).select("deliveredAt");

    // Group by date
    const earningsByDayMap = {};
    let totalEarnings = 0;

    orders.forEach(order => {
        const dateStr = new Date(order.deliveredAt).toISOString().split('T')[0];
        if (!earningsByDayMap[dateStr]) {
            earningsByDayMap[dateStr] = 0;
        }
        earningsByDayMap[dateStr] += RATE_PER_ORDER;
        totalEarnings += RATE_PER_ORDER;
    });

    const earningsByDay = Object.keys(earningsByDayMap).map(date => ({
        date,
        amount: earningsByDayMap[date]
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalEarnings,
        earningsByDay,
        startDate: startOfWeek,
        endDate: endOfWeek
      }
    });

  } catch (error) {
    console.error("Fetch Earnings Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const authResult = await authenticateDeliveryAssociate(req);
    if (!authResult.success) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.statusCode });
    }

    const { amount } = await req.json();
    
    if (!amount || amount <= 0) {
        return NextResponse.json({ success: false, message: "Invalid amount" }, { status: 400 });
    }

    // In a real app, check if wallet balance >= amount. 
    // Here we assume total earnings match balance roughly or just allow request.
    
    const da = authResult.user;
    da.payoutRequests.push({
        amount,
        status: 'pending',
        requestedAt: new Date()
    });

    await da.save();

    // Notify SuperAdmin
    const { default: Notification } = await import("@/models/Notification");
    await Notification.create({
        recipient: null, // or specific admin ID if needed, but recipientType 'admin' handles generic admin fetch
        recipientType: 'admin',
        title: 'New Payout Request',
        message: `Delivery Associate ${da.name} requested a payout of ₹${amount}`,
        type: 'payout_request',
        referenceId: da._id
    });

    return NextResponse.json({
      success: true,
      message: "Payout requested successfully",
      data: da.payoutRequests
    });

  } catch (error) {
    console.error("Payout Request Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
