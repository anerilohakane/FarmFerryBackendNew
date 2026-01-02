import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import Review from '@/models/Review';

// GET - Get all reviews
export async function GET(req) {
  try {
    
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const rating = searchParams.get('rating');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || "createdAt";
    const order = searchParams.get('order') || "desc";
    const page = parseInt(searchParams.get('page') || "1");
    const limit = parseInt(searchParams.get('limit') || "10");
    
    // Build query
    const query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (rating && rating !== 'all') {
      query.rating = parseInt(rating);
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { comment: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Prepare sort options
    const sortOptions = {};
    sortOptions[sort] = order === "asc" ? 1 : -1;
    
    // Get reviews with populated data
    const reviews = await Review.find(query)
      .populate("customer", "firstName lastName email profileImage")
      .populate("product", "name images")
      .populate("order", "orderNumber")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const totalReviews = await Review.countDocuments(query);
    
    return NextResponse.json(
      {
        success: true,
        data: {
          reviews,
          pagination: {
            total: totalReviews,
            page: page,
            limit: limit,
            pages: Math.ceil(totalReviews / limit)
          }
        },
        message: "Reviews fetched successfully"
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Get reviews error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}