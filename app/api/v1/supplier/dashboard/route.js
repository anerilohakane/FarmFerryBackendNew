import { NextResponse } from "next/server";
import connectDB from "@/lib/connectDB";
import Product from "@/models/Product";
import Order from "@/models/Order";
import { authenticateSupplier } from "@/middlewares/auth.middleware";

export async function GET(request) {
  try {
    await connectDB();

    /* --------------------------------
       AUTHENTICATION (CORRECT)
    -------------------------------- */
    const authResult = await authenticateSupplier(request);

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    const supplier = authResult.user;
    const supplierId = supplier._id;

    /* --------------------------------
       PRODUCT STATS
    -------------------------------- */
    const [totalProducts, activeProducts] = await Promise.all([
      Product.countDocuments({ supplierId }),
      Product.countDocuments({ supplierId, isActive: true })
    ]);

    /* --------------------------------
       ORDER STATS
    -------------------------------- */
    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      deliveredOrders
    ] = await Promise.all([
      Order.countDocuments({ supplier: supplierId }),
      Order.countDocuments({ supplier: supplierId, status: "pending" }),
      Order.countDocuments({ supplier: supplierId, status: "processing" }),
      Order.countDocuments({ supplier: supplierId, status: "delivered" })
    ]);

    /* --------------------------------
       RECENT ORDERS
    -------------------------------- */
    const recentOrders = await Order.find({ supplier: supplierId })
      .populate("customer", "firstName lastName phone addresses")
      .populate("items.product", "name")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    /* --------------------------------
       DATE CALCULATIONS (FIXED)
    -------------------------------- */
    const now = new Date();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    /* --------------------------------
       REVENUE AGGREGATIONS
    -------------------------------- */
    const [todayRevenue, monthlyRevenue, totalRevenue] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            supplier: supplierId,
            status: "delivered",
            createdAt: { $gte: startOfToday, $lte: endOfToday }
          }
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
      ]),
      Order.aggregate([
        {
          $match: {
            supplier: supplierId,
            status: "delivered",
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
      ]),
      Order.aggregate([
        {
          $match: {
            supplier: supplierId,
            status: "delivered"
          }
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
      ])
    ]);

    /* --------------------------------
       RESPONSE
    -------------------------------- */
    return NextResponse.json({
      success: true,
      message: "Supplier dashboard stats fetched successfully",
      data: {
        products: {
          total: totalProducts,
          active: activeProducts
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          processing: processingOrders,
          delivered: deliveredOrders
        },
        revenue: {
          today: todayRevenue[0]?.total || 0,
          monthly: monthlyRevenue[0]?.total || 0,
          total: totalRevenue[0]?.total || 0
        },
        recentOrders
      }
    });

  } catch (error) {
    console.error("Supplier dashboard error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
