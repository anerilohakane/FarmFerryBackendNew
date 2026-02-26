
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Define Schemas (Simplified)
const reviewSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    rating: Number,
    isVisible: { type: Boolean, default: true }
}, { strict: false });

const productSchema = new mongoose.Schema({
    name: String,
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 }
}, { strict: false });

async function migrateRatings() {
    console.log("Migration: Connecting to DB...");

    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is not defined");
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Migration: Connected.");

        const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);
        const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

        // Get all unique product IDs from reviews
        const productsWithReviews = await Review.distinct('product');
        console.log(`Found ${productsWithReviews.length} products with reviews.`);

        for (const productId of productsWithReviews) {
            const reviews = await Review.find({ product: productId, isVisible: true });

            if (reviews.length > 0) {
                const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
                const averageRating = totalRating / reviews.length;

                await Product.findByIdAndUpdate(productId, {
                    averageRating: parseFloat(averageRating.toFixed(1)),
                    totalReviews: reviews.length
                });

                console.log(`Updated Product ${productId}: Rating ${averageRating.toFixed(1)}, Count ${reviews.length}`);
            }
        }

        console.log("Migration completed successfully.");
        process.exit(0);

    } catch (error) {
        console.error("Migration Error:", error);
        process.exit(1);
    }
}

migrateRatings();
