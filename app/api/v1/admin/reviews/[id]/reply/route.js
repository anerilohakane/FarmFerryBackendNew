import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Review from '@/models/Review';

// POST - Reply to review
export async function POST(req, { params }) {
  try {
    
    await dbConnect();
    
    const { id } = params;
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
      createdBy: user.id,
      createdByModel: "Admin"
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