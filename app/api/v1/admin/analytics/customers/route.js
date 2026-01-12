import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import Customer from '@/models/Customer';

export async function GET(req) {
  try {
    await dbConnect();
    
    // Group new customers by date
    const newCustomers = await Customer.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        newCustomers
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
