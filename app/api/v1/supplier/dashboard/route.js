<<<<<<< HEAD
import Product from "@/models/Product";
import Order from "@/models/Order";
import { authenticateSupplier } from "@/middlewares/auth.middleware";
import connectDB from "@/lib/connectDB";
import { NextResponse } from "next/server";
=======
import { NextResponse } from "next/server";
import connectDB from "@/lib/connectDB";
import Product from "@/models/Product";
import Order from "@/models/Order";
import { authenticateSupplier } from "@/middlewares/auth.middleware";
>>>>>>> 0730f801cf6e3ae7d9323e20dd098732abae41ef

export async function GET(request) {
  try {
    await connectDB();

<<<<<<< HEAD
    // ✅ Read token safely
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // ✅ Authenticate supplier
    const supplier = await authenticateSupplier(token);

    if (!supplier) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // ✅ FIX: support both id and _id
    const supplierId = supplier._id || supplier.id;

    if (!supplierId) {
      return NextResponse.json(
        { success: false, message: "Supplier ID missing" },
        { status: 401 }
      );
    }

    // ✅ FIX: support both `supplier` and `supplierId` fields
    const productFilter = {
      $or: [{ supplier: supplierId }, { supplierId }]
    };

    const orderFilter = {
      supplier: supplierId
    };

    // ================= PRODUCTS =================
    const totalProducts = await Product.countDocuments(productFilter);

    const activeProducts = await Product.countDocuments({
      ...productFilter,
      isActive: true
    });

    // ================= ORDERS =================
    const totalOrders = await Order.countDocuments(orderFilter);

    const pendingOrders = await Order.countDocuments({
      ...orderFilter,
      status: "pending"
    });

    const processingOrders = await Order.countDocuments({
      ...orderFilter,
      status: "processing"
    });

    const deliveredOrders = await Order.countDocuments({
      ...orderFilter,
      status: "delivered"
    });

    // ================= RECENT ORDERS =================
    const recentOrders = await Order.find(orderFilter)
      .populate("items.product", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    // ================= REVENUE =================
    const totalRevenueAgg = await Order.aggregate([
      {
        $match: {
          supplier: supplierId,
          status: "delivered"
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" }
        }
      }
    ]);

    const totalRevenue =
      totalRevenueAgg.length > 0 ? totalRevenueAgg[0].total : 0;

    // ================= RESPONSE =================
=======
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
>>>>>>> 0730f801cf6e3ae7d9323e20dd098732abae41ef
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
<<<<<<< HEAD
          total: totalRevenue
=======
          today: todayRevenue[0]?.total || 0,
          monthly: monthlyRevenue[0]?.total || 0,
          total: totalRevenue[0]?.total || 0
>>>>>>> 0730f801cf6e3ae7d9323e20dd098732abae41ef
        },
        recentOrders
      }
    });

  } catch (error) {
<<<<<<< HEAD
    console.error("Dashboard stats error:", error);
=======
    console.error("Supplier dashboard error:", error);
>>>>>>> 0730f801cf6e3ae7d9323e20dd098732abae41ef
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
