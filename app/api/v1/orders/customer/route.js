import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Order from "@/models/Order";
import Customer from "@/models/Customer";
import { authenticate } from "@/middlewares/auth.middleware";

export async function GET(req) {
  try {
    await dbConnect();

    const authResult = await authenticate(req);
    if (!authResult.success) {
      console.error("❌ [MyOrders] Authentication failed:", authResult.error);
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const user = authResult.user;
    console.log(`✅ [MyOrders] Fetching orders for user: ${user._id}`);

    // In this system, the authenticated 'user' IS the Customer document.
    let customer = user;

    if (user.isMissing) {
      console.log(`🛠️ [MyOrders] Lazy creating customer profile for ID: ${user._id}`);
      try {
        customer = await Customer.create({
          _id: user._id,
          firstName: "Recovered",
          lastName: "User",
          role: "customer",
          isPhoneVerified: true
        });
      } catch (err) {
        console.error("❌ [MyOrders] Failed to lazy create customer:", err);
        if (err.code === 11000) {
          customer = await Customer.findById(user._id);
        }
        // If fail, we might just return empty orders or error? 
        // Let's continue, if customer is null, Order.find will return empty.
      }
    }

    if (authResult.role !== 'customer') {
      console.warn(`⚠️ [MyOrders] User role is '${authResult.role}', treating as customer.`);
    }

    const orders = await Order.find({ customer: customer._id })
      .populate("items.product supplier")
      .sort({ createdAt: -1 });

    console.log(`✅ [MyOrders] Found ${orders.length} orders for customer ${customer._id}`);

    return NextResponse.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error("❌ [MyOrders] Orders fetch error:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 }
    );
  }
}
