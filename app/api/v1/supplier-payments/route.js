import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import Supplier from '@/models/Supplier';
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

    let query = {};
    if (search) {
        query.$or = [
            { businessName: { $regex: search, $options: 'i' } },
            { ownerName: { $regex: search, $options: 'i' } },
            { _id: search }
        ];
    }

    const suppliers = await Supplier.find(query)
      .select('businessName ownerName _id phone payoutRequests')
      .lean();

    let allPayments = [];

    suppliers.forEach(supp => {
      if (supp.payoutRequests && supp.payoutRequests.length > 0) {
        supp.payoutRequests.forEach(payout => {
           if (status && status !== 'all' && payout.status !== status) return;
           
           allPayments.push({
             id: payout._id,
             supplier: {
               name: supp.businessName || supp.ownerName,
               id: supp._id,
               contact: supp.phone
             },
             amount: payout.amount,
             date: payout.requestedAt ? new Date(payout.requestedAt).toISOString().split('T')[0] : '',
             dueDate: '', // Placeholder
             status: payout.status,
             method: payout.method || 'bank_transfer',
             invoice: {
                 number: payout.transactionId || 'N/A',
                 date: payout.requestedAt ? new Date(payout.requestedAt).toISOString().split('T')[0] : ''
             },
             deliveryCount: 0, 
             notes: payout.adminNote
           });
        });
      }
    });

    allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));

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
    console.error('Supplier payments fetch error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}
