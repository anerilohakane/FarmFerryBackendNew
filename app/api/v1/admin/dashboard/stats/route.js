import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import Customer from '@/models/Customer';
import Supplier from '@/models/Supplier';
import Product from '@/models/Product';
import Order from '@/models/Order';
import Category from '@/models/Category';

// GET - Get dashboard stats
export async function GET(req) {
  try {
    
    await dbConnect();
    
    // Get customer stats
    const totalCustomers = await Customer.countDocuments();
    const newCustomers = await Customer.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    
    // Get supplier stats
    const totalSuppliers = await Supplier.countDocuments();
    const pendingSuppliers = await Supplier.countDocuments({ status: "pending" });
    const approvedSuppliers = await Supplier.countDocuments({ status: "approved" });
    
    // Get product stats
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });
    
    // Get order stats
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: "pending" });
    const processingOrders = await Order.countDocuments({ status: "processing" });
    const deliveredOrders = await Order.countDocuments({ status: "delivered" });
    
    // Get category stats
    const totalCategories = await Category.countDocuments();
    
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
    
    // Get recent orders
    const recentOrders = await Order.find()
      .populate("customer", "firstName lastName phone email")
      .populate("supplier", "businessName")
      .sort({ createdAt: -1 })
      .limit(5);
    
    return NextResponse.json(
      {
        success: true,
        data: { 
          customers: {
            total: totalCustomers,
            new: newCustomers
          },
          suppliers: {
            total: totalSuppliers,
            pending: pendingSuppliers,
            approved: approvedSuppliers
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
          categories: {
            total: totalCategories
          },
          revenue: {
            today: todayRevenue.length > 0 ? todayRevenue[0].total : 0,
            monthly: monthlyRevenue.length > 0 ? monthlyRevenue[0].total : 0,
            total: totalRevenue.length > 0 ? totalRevenue[0].total : 0
          },
          recentOrders
        },
        message: "Dashboard stats fetched successfully"
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}