import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Supplier from "@/models/Supplier";
import { authenticate } from "@/middlewares/auth.middleware";
import { corsHandler } from "@/utils/corsHandler";

export async function OPTIONS(req) {
  return new Response(null, {
    status: 204,
    headers: corsHandler(req),
  });
}

// GET: List all suppliers
export async function GET(req) {
  try {
    await dbConnect();

    const authResult = await authenticate(req);
    if (!authResult.success || authResult.role !== 'admin' && authResult.role !== 'superadmin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit')) || 10;
    const page = parseInt(searchParams.get('page')) || 1;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');

    const query = {};
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { ownerName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const suppliers = await Supplier.find(query)
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Supplier.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: {
        suppliers,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error("Fetch suppliers error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
