import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import Category from '@/models/Category';
import { requireRole } from '@/middlewares/auth.middleware';

export async function POST(req) {
  try {
    await dbConnect();
    
    // Auth check
    const authCheck = await requireRole(["admin", "superadmin"])(req);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.statusCode });
    }

    const { categoryId, handlingFee } = await req.json();

    if (!categoryId || handlingFee === undefined) {
      return NextResponse.json({ success: false, error: "Category ID and handling fee are required" }, { status: 400 });
    }

    const category = await Category.findByIdAndUpdate(
      categoryId,
      { handlingFee: parseFloat(handlingFee) },
      { new: true }
    );

    if (!category) {
      return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: category });

  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
