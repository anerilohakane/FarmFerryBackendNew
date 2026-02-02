import Product from "@/models/Product";
import Order from "@/models/Order";
import { authenticateSupplier } from "@/middlewares/auth.middleware";
import connectDB from "@/lib/connectDB";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    await connectDB();

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
          total: totalRevenue
        },
        recentOrders
      }
    });

  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
