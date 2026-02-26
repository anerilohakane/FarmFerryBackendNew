import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Review from "@/models/Review"; // Imports Review singleton
import Product from "@/models/Product"; // Imports Product model to register it
import { authenticate } from "@/middlewares/auth.middleware";
import mongoose from "mongoose";

/**
 * POST /api/v1/reviews
 * Creates a new review for a product
 */
export async function POST(request) {
  try {
    console.log("POST /api/v1/reviews - Request received");
    await dbConnect();
    console.log("DB Connected. State:", mongoose.connection.readyState);

    // 1. Authenticate User
    const authResult = await authenticate(request);
    if (!authResult.success) {
      console.log("Authentication failed:", authResult.error);
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const { user } = authResult;
    const userId = user._id;
    console.log("User Authenticated:", userId);

    // 2. Parse Body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const { productId, rating, title, comment } = body;
    console.log("Review payload:", { productId, rating, title, comment });

    // 3. Validation
    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Product ID is required" },
        { status: 400 }
      );
    }

    if (!rating) {
      return NextResponse.json(
        { success: false, error: "Rating is required" },
        { status: 400 }
      );
    }

    // Verify product exists
    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
      console.log("Product not found:", productId);
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // 4. Create Review
    const reviewData = {
      product: productId,
      customer: userId,
      rating: Number(rating),
      title: title || "",
      comment: comment || "",
      isVerified: true,
      isVisible: true
    };

    console.log("Attempting to create review in DB:", mongoose.connection.db.databaseName);

    // Explicitly using Review model from import
    const review = await Review.create(reviewData);

    console.log("Review created successfully. ID:", review._id);

    return NextResponse.json(
      {
        success: true,
        data: review,
        message: "Review submitted successfully",
        debug: {
          dbName: mongoose.connection.db.databaseName,
          reviewId: review._id
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("POST /api/v1/reviews error:", error);

    // Handle duplicate key error (MongoDB code 11000)
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "You have already reviewed this product" },
        { status: 400 }
      );
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(val => val.message);
      return NextResponse.json(
        { success: false, error: messages.join(", ") },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/reviews
 * Get reviews, potentially filtered by productId
 */
export async function GET(request) {
  try {
    await dbConnect();

    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");
    console.log("GET /api/v1/reviews - Query:", productId);

    let query = { isVisible: true };
    if (productId) {
      query.product = productId;
    }

    const reviews = await Review.find(query)
      .populate("customer", "firstName lastName profileImage addresses") // Populate customer details incl addresses for name fallback
      .sort({ createdAt: -1 });

    console.log(`Found ${reviews.length} reviews`);

    return NextResponse.json({
      success: true,
      count: reviews.length,
      data: reviews
    });

  } catch (error) {
    console.error("GET /api/v1/reviews error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
