import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Review from '@/models/Review';
import { requireAuth } from '@/lib/auth';

// GET - Get review statistics
export async function GET(req) {
  try {
    
    await dbConnect();
    
    // Get total reviews
    const totalReviews = await Review.countDocuments();
    
    // Get reviews by status
    const pendingReviews = await Review.countDocuments({ status: 'pending' });
    const approvedReviews = await Review.countDocuments({ status: 'approved' });
    const rejectedReviews = await Review.countDocuments({ status: 'rejected' });
    
    // Get average rating
    const avgRatingResult = await Review.aggregate([
      { $group: { _id: null, avgRating: { $avg: "$rating" } } }
    ]);
    const avgRating = avgRatingResult.length > 0 ? parseFloat(avgRatingResult[0].avgRating.toFixed(1)) : 0;
    
    // Get rating distribution
    const ratingDistribution = await Review.aggregate([
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]);
    
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratingDistribution.forEach(item => {
      distribution[item._id] = item.count;
    });
    
    return NextResponse.json(
      {
        success: true,
        data: {
          totalReviews,
          pendingReviews,
          approvedReviews,
          rejectedReviews,
          avgRating,
          distribution
        },
        message: "Review statistics fetched successfully"
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Get review stats error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}