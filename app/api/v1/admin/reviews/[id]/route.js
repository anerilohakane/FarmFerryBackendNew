import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Review from '@/models/Review';

// GET - Get review by ID
export async function GET(req, { params }) {
  try {
    
    await dbConnect();
    
    const { id } = params;
    
    const review = await Review.findById(id)
      .populate("customer", "firstName lastName email profileImage")
      .populate("product", "name images description")
      .populate("order", "orderNumber status")
      .populate("reply.createdBy", "firstName lastName");
    
    if (!review) {
      return NextResponse.json(
        { success: false, message: "Review not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      {
        success: true,
        data: { review },
        message: "Review fetched successfully"
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Get review by ID error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update review status
export async function PUT(req, { params }) {
  try {
    
    await dbConnect();
    
    const { id } = params;
    const body = await req.json();
    const { status, isVisible } = body;
    
    // Handle status update
    if (status) {
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
      
      return NextResponse.json(
        {
          success: true,
          data: { review },
          message: `Review ${status} successfully`
        },
        { status: 200 }
      );
    }
    
    // Handle visibility toggle
    if (typeof isVisible === 'boolean') {
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
      
      return NextResponse.json(
        {
          success: true,
          data: { review },
          message: `Review ${isVisible ? 'made visible' : 'hidden'} successfully`
        },
        { status: 200 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: "Either status or isVisible must be provided" },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Update review error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete review
export async function DELETE(req, { params }) {
  try {
    
    await dbConnect();
    
    const { id } = params;
    
    const review = await Review.findById(id);
    if (!review) {
      return NextResponse.json(
        { success: false, message: "Review not found" },
        { status: 404 }
      );
    }
    
    // TODO: Delete images from cloudinary if they exist
    // if (review.images && review.images.length > 0) {
    //   const deletePromises = review.images.map(image => 
    //     deleteFromCloudinary(image.publicId)
    //   );
    //   await Promise.all(deletePromises);
    // }
    
    await Review.findByIdAndDelete(id);
    
    return NextResponse.json(
      {
        success: true,
        message: "Review deleted successfully"
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Delete review error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}