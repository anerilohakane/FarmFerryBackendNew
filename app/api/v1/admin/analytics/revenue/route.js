import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import Order from '@/models/Order';

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

    const { searchParams } = new URL(req.url);

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const matchStage = {
        status: { $in: ["delivered", "processing", "out_for_delivery"] }
    };
    if (startDate && endDate) {
        matchStage.createdAt = { 
            $gte: new Date(startDate), 
            $lte: new Date(endDate) 
        };
    }

    // Aggregate revenue by date
    const revenueOverTime = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        analytics: {
            data: revenueOverTime
        }
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
