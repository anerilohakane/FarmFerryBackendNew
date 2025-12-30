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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sort = searchParams.get('sort') || "createdAt";
    const order = searchParams.get('order') || "desc";
    const page = parseInt(searchParams.get('page') || "1");
    const limit = parseInt(searchParams.get('limit') || "10");
    const debugAll = searchParams.get('debugAll');
    
    let queryOptions;
    if (debugAll === 'true') {
      queryOptions = {};
    } else {
      queryOptions = { supplier: supplier._id };
    }
    
    // Filter by status
    if (status) {
      queryOptions.status = status;
    }
    
    // Filter by customer
    if (customerId) {
      queryOptions.customer = customerId;
    }
    
    // Filter by date range
    if (startDate && endDate) {
      queryOptions.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      queryOptions.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      queryOptions.createdAt = { $lte: new Date(endDate) };
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Prepare sort options
    const sortOptions = {};
    sortOptions[sort] = order === "asc" ? 1 : -1;
    
    // Get orders with pagination
    const orders = await Order.find(queryOptions)
      .populate("customer", "firstName lastName email")
      .populate("items.product", "name images")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const totalOrders = await Order.countDocuments(queryOptions);
    
    return NextResponse.json({
      success: true,
      message: "Supplier orders fetched successfully",
      data: { 
        orders,
        pagination: {
          total: totalOrders,
          page,
          limit,
          pages: Math.ceil(totalOrders / limit)
        }
      }
    });

  } catch (error) {
    console.error("Get orders error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}