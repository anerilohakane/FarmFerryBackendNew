import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import Customer from '@/models/Customer';

import { corsHandler } from "@/utils/corsHandler";
import { authenticate } from "@/middlewares/auth.middleware";

export async function OPTIONS(req) {
  return new Response(null, {
    status: 204,
    headers: corsHandler(req),
  });
}

export async function GET(req) {
  try {
    await dbConnect();

    // Auth check
    const authResult = await authenticate(req);
    if (!authResult.success) {
        return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.statusCode });
    }
    
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
