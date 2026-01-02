import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import Customer from '@/models/Customer';

// GET - Get all customers
export async function GET(req) {
  try {
    
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || "createdAt";
    const order = searchParams.get('order') || "desc";
    const page = parseInt(searchParams.get('page') || "1");
    const limit = parseInt(searchParams.get('limit') || "10");
    
    const queryOptions = {};
    
    // Search by name or email
    if (search) {
      queryOptions.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Prepare sort options
    const sortOptions = {};
    sortOptions[sort] = order === "asc" ? 1 : -1;
    
    // Get customers with pagination
    const customers = await Customer.find(queryOptions)
      .select("-password -passwordResetToken -passwordResetExpires")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const totalCustomers = await Customer.countDocuments(queryOptions);
    
    return NextResponse.json(
      {
        success: true,
        data: { 
          customers,
          pagination: {
            total: totalCustomers,
            page: page,
            limit: limit,
            pages: Math.ceil(totalCustomers / limit)
          }
        },
        message: "Customers fetched successfully"
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}