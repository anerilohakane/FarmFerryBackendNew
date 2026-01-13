import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import DeliveryAssociate from '@/models/DeliveryAssociate';
import { authenticate } from "@/middlewares/auth.middleware";

export async function GET(req) {
  try {
    await dbConnect();
    const authResult = await authenticate(req);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.statusCode });
    }

    if (authResult.role !== 'admin' && authResult.role !== 'superadmin') {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const method = searchParams.get('method');
    // Note: Pagination for flattened list is tricky in backend. 
    // We will fetch associates with relevant payouts and then flatten.
    // For large scale, aggregation framework is better.

    let query = {};
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { _id: search } // exact match for ID
        ];
    }

    // Optimization: If status provided, only fetch associates who have matching requests?
    // Hard to filter subdocuments in find(), but we can do post-processing or use aggregation.
    // Using simple fetch + filter for now.

    const associates = await DeliveryAssociate.find(query)
      .select('name _id vehicle phone payoutRequests')
      .lean();

    let allPayments = [];

    associates.forEach(assoc => {
      if (assoc.payoutRequests && assoc.payoutRequests.length > 0) {
        assoc.payoutRequests.forEach(payout => {
           // Apply filters
           if (status && status !== 'all' && payout.status !== status) return;
           
           // Mock method if not present (as schema might not have it yet)
           // DeliveryAssociate schema check: status, amount, requestedAt... 
           // Does it have method? 'method' is not in the schema viewed earlier.
           // We will rely on what's available or default.
           
           allPayments.push({
             id: payout._id,
             partner: {
               name: assoc.name,
               id: assoc._id,
               vehicle: assoc.vehicle?.type,
               contact: assoc.phone
             },
             amount: payout.amount,
             date: payout.requestedAt ? new Date(payout.requestedAt).toISOString().split('T')[0] : '',
             status: payout.status,
             method: 'bank_transfer', // Default/Placeholder as schema might strictly defined enum
             deliveries: 0, // Placeholder, would need to count deliveries
             bonus: 0,
             deductions: 0,
             notes: payout.adminNote
           });
        });
      }
    });

    // Sort by date desc
    allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Manual Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const totalRecords = allPayments.length;
    const startIndex = (page - 1) * limit;
    const paginatedPayments = allPayments.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      data: {
        records: paginatedPayments,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalRecords / limit),
          totalRecords,
          limit
        }
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Delivery payments fetch error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}
