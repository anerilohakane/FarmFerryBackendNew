import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import Order from '@/models/Order';
import Customer from '@/models/Customer';
import { authenticate } from "@/middlewares/auth.middleware";

export async function GET(req) {
  try {
    await dbConnect();
    const authResult = await authenticate(req);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.statusCode });
    }

    // Role check - allow admin and superadmin
    if (authResult.role !== 'admin' && authResult.role !== 'superadmin') {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const method = searchParams.get('method');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const query = {};

    // Filter by status
    if (status && status !== 'all') {
      if (status === 'paid_returned') {
          query.status = 'returned';
          query.paymentStatus = 'paid';
      } else {
          // Check if status matches paymentStatus or orderStatus
          // Simplification: Match paymentStatus if it's one of the payment statuses
          if (['pending', 'paid', 'failed', 'refunded'].includes(status)) {
             query.paymentStatus = status;
          } else {
             query.status = status;
          }
      }
    }

    // Filter by method
    if (method && method !== 'all') {
      query.paymentMethod = method;
    }

    // Search query (Order ID or Customer Name)
    // Note: Searching by customer name requires looking up customers first or using aggregation
    if (search) {
       // Simple search by Order ID first
       const orderIdQuery = { orderId: { $regex: search, $options: 'i' } };
       
       // Find customers matching the name
       const customers = await Customer.find({
           $or: [
               { firstName: { $regex: search, $options: 'i' } },
               { lastName: { $regex: search, $options: 'i' } },
               { email: { $regex: search, $options: 'i' } }
           ]
       }).select('_id');
       
       const customerIds = customers.map(c => c._id);
       
       query.$or = [
           orderIdQuery,
           { customer: { $in: customerIds } }
       ];
    }

    const skip = (page - 1) * limit;

    const [orders, totalRecords] = await Promise.all([
      Order.find(query)
        .populate('customer', 'firstName lastName email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query)
    ]);

    // Map to the format expected by frontend
    const records = orders.map(order => ({
      id: order.orderId,
      customer: order.customer ? {
          name: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
          email: order.customer.email,
          phone: order.customer.phone
      } : { name: 'Unknown Customer' },
      amount: order.totalAmount,
      status: order.paymentStatus, // Primary status is payment status
      orderStatus: order.status,   // Include details
      method: order.paymentMethod,
      date: order.createdAt.toISOString().split('T')[0], // YYYY-MM-DD
      transactionId: order.transactionId
    }));

    return NextResponse.json({
      success: true,
      data: {
        records,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalRecords / limit),
          totalRecords,
          limit
        }
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Customer payments fetch error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}
