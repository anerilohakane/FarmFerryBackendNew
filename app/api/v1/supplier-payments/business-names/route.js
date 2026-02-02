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

    const suppliers = await Supplier.find({}, 'businessName _id email phone');

    return NextResponse.json({
      success: true,
      data: suppliers
    }, { status: 200 });

  } catch (error) {
    console.error('Fetch supplier names error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}

// Support getting generic details for a specific supplier if needed
export async function POST(req) {
    // Legacy support or specific details
    return NextResponse.json({ success: false, message: 'Method not implemented' }, { status: 405 });
}
