import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import Review from '@/models/Review';

import { corsHandler } from "@/utils/corsHandler";
import { authenticate } from "@/middlewares/auth.middleware";

export async function OPTIONS(req) {
  return new Response(null, {
    status: 204,
    headers: corsHandler(req),
  });
}

// POST - Reply to review
export async function POST(req, context) {
  try {
    await dbConnect();
    const authResult = await authenticate(req);
    if (!authResult.success) {
        return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.statusCode });
    }
    const user = authResult.user;

    const { id } = await context.params;
    const body = await req.json();
    const { content } = body;
    
    if (!content || content.trim() === '') {
      return NextResponse.json(
        { success: false, message: "Reply content is required" },
        { status: 400 }
      );
    }
    
    const review = await Review.findById(id).populate("product");
    if (!review) {
      return NextResponse.json(
        { success: false, message: "Review not found" },
        { status: 404 }
      );
    }
    
    // Add reply
    review.reply = {
      content: content.trim(),
      createdAt: new Date(),
      createdBy: user._id,
      createdByModel: "Admin" // Simplified
    };
    
    await review.save();
    
    return NextResponse.json(
      {
        success: true,
        data: { review },
        message: "Reply added successfully"
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Reply to review error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}