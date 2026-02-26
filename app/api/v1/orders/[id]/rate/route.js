import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Order from "@/models/Order";
import Review from "@/models/Review"; // Added Review model
import { authenticate } from "@/middlewares/auth.middleware";
import mongoose from "mongoose";
import { corsHandler } from "@/utils/corsHandler";

export async function OPTIONS(req) {
    return new Response(null, {
        status: 204,
        headers: corsHandler(req),
    });
}

export async function POST(req, context) {
    try {
        await dbConnect();

        // Auth check
        const authResult = await authenticate(req);
        if (!authResult.success) {
            return NextResponse.json(
                { success: false, message: authResult.error || "Unauthorized" },
                { status: authResult.statusCode || 401 }
            );
        }

        const user = authResult.user;
        const { id } = await context.params; // Order ID

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, message: "Invalid order ID" },
                { status: 400 }
            );
        }

        const { rating, feedback } = await req.json();

        if (!rating || rating < 1 || rating > 5) {
            return NextResponse.json(
                { success: false, message: "Valid rating (1-5) is required" },
                { status: 400 }
            );
        }

        const order = await Order.findById(id).populate('items.product');

        if (!order) {
            return NextResponse.json(
                { success: false, message: "Order not found" },
                { status: 404 }
            );
        }

        // Verify ownership
        // Ensure the authenticated user is the customer who placed the order
        if (order.customer.toString() !== user._id.toString()) {
            return NextResponse.json(
                { success: false, message: "You are not authorized to rate this order" },
                { status: 403 }
            );
        }

        // Update order with rating and feedback (keep existing logic)
        order.rating = rating;
        if (feedback) {
            order.feedback = feedback;
        }

        await order.save();

        // --- NEW: Create Reviews for each product in the order ---
        // Iterate through items and create a Review entry for each product
        // Note: Using `Promise.all` to handle multiple products efficiently
        const reviewPromises = order.items.map(async (item) => {
            const productId = item.product._id || item.product; // Handle populated vs unpopulated

            // Check if review already exists to avoid duplicates (unique index on product+customer)
            const existingReview = await Review.findOne({
                product: productId,
                customer: user._id
            });

            if (!existingReview) {
                try {
                    await Review.create({
                        product: productId,
                        customer: user._id,
                        order: order._id,
                        rating: Number(rating), // Use the order rating for the product too
                        comment: feedback || "", // Use order feedback
                        title: "Verified Purchase Review",
                        isVerified: true,
                        isVisible: true
                    });
                    console.log(`Review created for product ${productId} from order ${id}`);
                } catch (reviewErr) {
                    console.error(`Failed to create review for product ${productId}:`, reviewErr.message);
                    // Don't fail the whole request if one review fails (e.g. duplicate)
                }
            }
        });

        await Promise.all(reviewPromises);
        // ---------------------------------------------------------

        return NextResponse.json({
            success: true,
            message: "Order rated and reviews submitted successfully",
            data: order
        });

    } catch (error) {
        console.error("Rate Order Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
