import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import Customer from '@/models/Customer';
import Supplier from '@/models/Supplier';
import Product from '@/models/Product';
import Order from '@/models/Order';
import Category from '@/models/Category';
import DeliveryAssociate from '@/models/DeliveryAssociate';

import { corsHandler } from "@/utils/corsHandler";
import { authenticate } from "@/middlewares/auth.middleware";

export async function OPTIONS(req) {
  return new Response(null, {
    status: 204,
    headers: corsHandler(req),
  });
}

// GET - Get superadmin dashboard stats
export async function GET(req) {
  try {
    await dbConnect();

    // Auth check
    const authResult = await authenticate(req);
    if (!authResult.success) {
        return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.statusCode });
    }
    
    // Optional: Strict role check if needed, though authenticate handles token validity
    if (authResult.role !== 'superadmin') {
       // Ideally we might restrict this, but for now let's allow it or check requirements.
       // Given the path is /superadmin/..., let's enforce it.
       return NextResponse.json({ success: false, error: 'Access denied. Super Admin role required.' }, { status: 403 });
    }

    
    // Get customer stats
    const totalCustomers = await Customer.countDocuments();
    
    // Get supplier stats
    const totalSuppliers = await Supplier.countDocuments();
    const pendingSuppliers = await Supplier.countDocuments({ status: "pending" });
    
    // Get product stats
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });
    
    // Get order stats
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: "pending" });
    const processingOrders = await Order.countDocuments({ status: "processing" });
    const deliveredOrders = await Order.countDocuments({ status: "delivered" });

    // Get delivery associate stats
    // Note: Checking if DeliveryAssociate model exists and has status field
    let totalDA = 0;
    try {
        totalDA = await DeliveryAssociate.countDocuments();
    } catch (e) {
        console.log("DeliveryAssociate model might allow simple count", e.message);
    }
    
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
          status: { $in: ["delivered", "processing", "out_for_delivery"] },
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
          status: { $in: ["delivered", "processing", "out_for_delivery"] },
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
          status: { $in: ["delivered", "processing", "out_for_delivery"] }
        } 
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: "$totalAmount" } 
        } 
      }
    ]);
    
    // Get recent orders for "Recent Payments" (using orders as proxy for now)
    const recentOrders = await Order.find()
      .populate("customer", "firstName lastName name phone email") // support both name formats if Schema varies
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Last 6 days revenue for chart
    const last6Days = [];
    for(let i=5; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
        
        const startDay = new Date(d.setHours(0,0,0,0));
        const endDay = new Date(d.setHours(23,59,59,999));
        
        const dayRev = await Order.aggregate([
            { 
                $match: { 
                status: { $in: ["delivered", "processing", "out_for_delivery"] },
                createdAt: { $gte: startDay, $lte: endDay }
                } 
            },
            { 
                $group: { 
                _id: null, 
                total: { $sum: "$totalAmount" } 
                } 
            }
        ]);
        last6Days.push({ name: dayStr, revenue: dayRev.length > 0 ? dayRev[0].total : 0 });
    }

    return NextResponse.json(
      {
        success: true,
        data: { 
          customers: {
            total: totalCustomers
          },
          suppliers: {
            total: totalSuppliers,
            pending: pendingSuppliers
          },
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
            total: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
            lastSixDays: last6Days
          },
          deliveryAssociates: {
            total: totalDA
          },
          recentOrders
        },
        message: "Super Admin Dashboard stats fetched successfully"
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Get superadmin dashboard stats error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
