import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import Order from '@/models/Order';
import Customer from '@/models/Customer';
import Product from '@/models/Product';
import { corsHandler } from '@/utils/corsHandler';

export async function GET(req) {
  await dbConnect();

  try {
    // Fetch orders that are returned or have a refund status
    const query = {
      $or: [
        { status: 'returned' },
        { refundStatus: { $in: ['pending', 'processing', 'refunded', 'failed'] } }
      ]
    };

    const orders = await Order.find(query)
      .populate('customer', 'firstName lastName phone email')
      .populate('items.product', 'name price images')
      .sort({ updatedAt: -1 });

    return NextResponse.json(
      { success: true, count: orders.length, data: orders },
      { headers: corsHandler(req) }
    );
  } catch (error) {
    console.error('Error fetching refund orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch refund orders' },
      { status: 500, headers: corsHandler(req) }
    );
  }
}

export async function OPTIONS(req) {
  return NextResponse.json({}, { status: 200, headers: corsHandler(req) });
}
