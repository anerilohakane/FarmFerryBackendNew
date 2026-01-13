import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import Review from '@/models/Review';
import { authenticate } from '@/middlewares/auth.middleware';
import { corsHandler } from '@/utils/corsHandler';

export async function OPTIONS(req) {
  return new Response(null, {
    status: 204,
    headers: corsHandler(req),
  });
}

export async function PUT(req, context) {
  try {
    await dbConnect();
    const authResult = await authenticate(req);
    if (!authResult.success) {
        return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.statusCode });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { status } = body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
        return NextResponse.json(
          { success: false, message: "Valid status is required (approved, rejected, pending)" },
          { status: 400 }
        );
    }
      
    const review = await Review.findByIdAndUpdate(
        id,
        { status },
        { new: true }
    ).populate("customer", "firstName lastName email");
      
    if (!review) {
        return NextResponse.json(
          { success: false, message: "Review not found" },
          { status: 404 }
        );
    }
      
    return NextResponse.json({
        success: true,
        data: { review },
        message: `Review ${status} successfully`
    });

  } catch (error) {
    console.error('Update review status error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
