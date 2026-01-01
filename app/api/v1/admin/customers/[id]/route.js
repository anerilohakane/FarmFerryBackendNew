import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Customer from '@/models/Customer';

// GET - Get customer by ID
export async function GET(req, { params }) {
  try {
    
    await dbConnect();
    
    const { id } = params;
    
    const customer = await Customer.findById(id)
      .select("-password -passwordResetToken -passwordResetExpires");
    
    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      {
        success: true,
        data: { customer },
        message: "Customer fetched successfully"
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Get customer by ID error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}