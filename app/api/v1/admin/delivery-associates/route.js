import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import DeliveryAssociate from '@/models/DeliveryAssociate';

// GET - Get all delivery associates
export async function GET(req) {
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
    
    // Search by name, email, or phone
    if (search) {
      queryOptions.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } }
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
    
    // Get delivery associates with pagination
    const deliveryAssociates = await DeliveryAssociate.find(queryOptions)
      .select("-password -passwordResetToken -passwordResetExpires")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const totalDeliveryAssociates = await DeliveryAssociate.countDocuments(queryOptions);
    
    return NextResponse.json(
      {
        success: true,
        data: { 
          deliveryAssociates,
          pagination: {
            total: totalDeliveryAssociates,
            page: page,
            limit: limit,
            pages: Math.ceil(totalDeliveryAssociates / limit)
          }
        },
        message: "Delivery associates fetched successfully"
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Get delivery associates error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create delivery associate
export async function POST(req) {
  try {
    
    await dbConnect();
    
    const body = await req.json();
    const { name, email, phone, password, status = 'Active', vehicleType = 'Motorcycle', address, specialization } = body;
    
    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { success: false, message: 'Name, email, phone, and password are required' },
        { status: 400 }
      );
    }
    
    // Check for duplicate email/phone
    const existing = await DeliveryAssociate.findOne({ $or: [{ email }, { phone }] });
    
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'A delivery associate with this email or phone already exists' },
        { status: 409 }
      );
    }
    
    const deliveryAssociate = await DeliveryAssociate.create({
      name,
      email,
      phone,
      password,
      status,
      isActive: status === 'Active',
      vehicle: { type: vehicleType },
      address,
      specialization,
      isVerified: false,
      activeAssignments: 0,
      ordersCompleted: 0,
      rating: 0,
      joinedDate: new Date(),
      lastActive: new Date(),
    });
    
    return NextResponse.json(
      {
        success: true,
        data: { deliveryAssociate },
        message: 'Delivery associate created successfully'
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Create delivery associate error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}