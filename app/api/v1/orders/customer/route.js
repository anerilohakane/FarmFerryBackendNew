import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Order from "@/models/Order";
import Customer from "@/models/Customer";
import { verifyJWT } from "@/middlewares/auth.middleware";

export async function GET(req) {
  try {
    await dbConnect();

    const user = await verifyJWT(req);

    const customer = await Customer.findOne({ user: user._id });
    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer profile not found" },
        { status: 404 }
      );
    }

    const orders = await Order.find({ customer: customer._id })
      .populate("items.product supplier")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error("Orders fetch error:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 }
    );
  }
}
