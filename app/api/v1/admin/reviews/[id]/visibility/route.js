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
    const { isVisible } = body;

    if (typeof isVisible !== 'boolean') {
        return NextResponse.json({ success: false, message: "isVisible boolean is required" }, { status: 400 });
    }
      
    const review = await Review.findByIdAndUpdate(
        id,
        { isVisible },
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
        message: `Review ${isVisible ? 'made visible' : 'hidden'} successfully`
    });

  } catch (error) {
    console.error('Update review visibility error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
