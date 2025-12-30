import Product from "@/models/Product";
import Order from "@/models/Order";
import { authenticateSupplier } from "@/middlewares/auth.middleware";
import connectDB from "@/lib/connectDB";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    await connectDB();
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const supplier = await authenticateSupplier(token);
    
    if (!supplier) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const supplierId = supplier._id;
    
    // Get total products
    const totalProducts = await Product.countDocuments({ supplierId });
    
    // Get active products
    const activeProducts = await Product.countDocuments({ 
      supplierId, 
      isActive: true 
    });
    
    // Get total orders
    const totalOrders = await Order.countDocuments({ supplier: supplierId });
    
    // Get orders by status
    const pendingOrders = await Order.countDocuments({ 
      supplier: supplierId, 
      status: "pending" 
    });
    
    const processingOrders = await Order.countDocuments({ 
      supplier: supplierId, 
      status: "processing" 
    });
    
    const deliveredOrders = await Order.countDocuments({ 
      supplier: supplierId, 
      status: "delivered" 
    });
    
    // Get recent orders
    const recentOrders = await Order.find({ supplier: supplierId })
      .populate("customer", "firstName lastName phone email addresses")
      .populate("items.product", "name")
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Get revenue stats
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Today's revenue
    const todayRevenue = await Order.aggregate([
      { 
        $match: { 
          supplier: supplierId,
          status: "delivered",
          createdAt: { $gte: startOfToday, $lte: endOfToday }
        } 
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: "$totalAmount" } 
        } 
      }
    ]);
    
    // Monthly revenue
    const monthlyRevenue = await Order.aggregate([
      { 
        $match: { 
          supplier: supplierId,
          status: "delivered",
          createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        } 
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: "$totalAmount" } 
        } 
      }
    ]);
    
    // Total revenue
    const totalRevenue = await Order.aggregate([
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
          today: todayRevenue.length > 0 ? todayRevenue[0].total : 0,
          monthly: monthlyRevenue.length > 0 ? monthlyRevenue[0].total : 0,
          total: totalRevenue.length > 0 ? totalRevenue[0].total : 0
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