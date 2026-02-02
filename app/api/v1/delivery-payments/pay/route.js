import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import DeliveryAssociate from '@/models/DeliveryAssociate';
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

    const { associateId, payoutId, status, notes, method } = await req.json();

    if (!associateId || !payoutId || !status) {
        return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const associate = await DeliveryAssociate.findById(associateId);
    if (!associate) {
        return NextResponse.json({ success: false, message: 'Associate not found' }, { status: 404 });
    }

    const payout = associate.payoutRequests.id(payoutId);
    if (!payout) {
        return NextResponse.json({ success: false, message: 'Payout request not found' }, { status: 404 });
    }

    payout.status = status;
    if (notes) payout.adminNote = notes;
    if (status === 'processed' || status === 'completed') {
        payout.processedAt = new Date();
    }
    // If schema supports method, save it
    // payout.method = method; 

    await associate.save();

    return NextResponse.json({
      success: true,
      message: 'Payout updated successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Update delivery payout error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}
