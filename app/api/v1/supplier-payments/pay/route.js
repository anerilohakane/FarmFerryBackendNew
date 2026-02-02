import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import Supplier from '@/models/Supplier';
import { authenticate } from "@/middlewares/auth.middleware";

export async function POST(req) {
  try {
    await dbConnect();
    const authResult = await authenticate(req);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.statusCode });
    }

    if (authResult.role !== 'admin' && authResult.role !== 'superadmin') {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { supplierId, payoutId, status, notes, method } = await req.json();

    if (!supplierId || !payoutId || !status) {
        return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
        return NextResponse.json({ success: false, message: 'Supplier not found' }, { status: 404 });
    }

    const payout = supplier.payoutRequests.id(payoutId);
    if (!payout) {
        return NextResponse.json({ success: false, message: 'Payout request not found' }, { status: 404 });
    }

    payout.status = status;
    if (notes) payout.adminNote = notes;
    if (method) payout.method = method; // Supplier schema explicitly has method now
    if (status === 'processed' || status === 'completed') {
        payout.processedAt = new Date();
    }

    await supplier.save();

    return NextResponse.json({
      success: true,
      message: 'Supplier payout updated successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Update supplier payout error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}
