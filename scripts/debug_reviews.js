
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debugReviews() {
    console.log("Debug: Connecting to DB...", process.env.MONGODB_URI ? "URI Found" : "URI Missing");

    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is not defined in .env.local");
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Debug: Connected.");

        // Define Schema (Simplified to avoid import issues, matching the file)
        const reviewSchema = new mongoose.Schema({
            product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
            customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
            rating: Number,
            title: String,
            comment: String,
            isVisible: { type: Boolean, default: true }
        }, { timestamps: true, strict: false }); // strict false to see whatever is there

        const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

        const count = await Review.countDocuments();
        console.log(`Debug: Total Reviews in DB: ${count}`);

        const reviews = await Review.find().sort({ createdAt: -1 }).limit(5);
        console.log("Debug: 5 Most Recent Reviews:");
        console.log(JSON.stringify(reviews, null, 2));

        process.exit(0);

    } catch (error) {
        console.error("Debug Error:", error);
        process.exit(1);
    }
}

debugReviews();
