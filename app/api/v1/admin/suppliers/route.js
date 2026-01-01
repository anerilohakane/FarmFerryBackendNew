import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Supplier from '@/models/Supplier';
import { withAuth } from '@/lib/auth';

// GET - Get all suppliers
export const GET = withAuth(async (req) => {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || "createdAt";
    const order = searchParams.get('order') || "desc";
    const page = parseInt(searchParams.get('page') || "1");
    const limit = parseInt(searchParams.get('limit') || "10");
    
    const queryOptions = {};
    
    // Search by business name, owner name, or email
    if (search) {
      queryOptions.$or = [
        { businessName: { $regex: search, $options: "i" } },
        { ownerName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }
    
    // Filter by status
    if (status) {
      queryOptions.status = status;
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Prepare sort options
    const sortOptions = {};
    sortOptions[sort] = order === "asc" ? 1 : -1;
    
    // Get suppliers with pagination
    const suppliers = await Supplier.find(queryOptions)
      .select("-password -passwordResetToken -passwordResetExpires")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const totalSuppliers = await Supplier.countDocuments(queryOptions);
    
    return NextResponse.json(
      {
        success: true,
        data: { 
          suppliers,
          pagination: {
            total: totalSuppliers,
            page: page,
            limit: limit,
            pages: Math.ceil(totalSuppliers / limit)
          }
        },
        message: "Suppliers fetched successfully"
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Get suppliers error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}, true);

// POST - Create new supplier
export const POST = withAuth(async (req) => {
  try {
    await dbConnect();
    
    const body = await req.json();
    const { businessName, ownerName, email, phone, status, address, password } = body;
    
    if (!businessName || !ownerName || !email || !phone) {
      return NextResponse.json(
        { success: false, message: "Business name, owner name, email, and phone are required" },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    const existing = await Supplier.findOne({ email });
    
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Supplier with this email already exists" },
        { status: 400 }
      );
    }
    
    const supplier = await Supplier.create({
      businessName,
      ownerName,
      email,
      phone,
      status: status || "pending",
      address,
      password: password || Math.random().toString(36).slice(-8),
    });
    
    return NextResponse.json(
      {
        success: true,
        data: { supplier },
        message: "Supplier created successfully"
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Create supplier error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}, true);