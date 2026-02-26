import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI not found in .env.local');
    process.exit(1);
}

// Schemas (Simplified)
const reviewSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    rating: Number,
    isVisible: { type: Boolean, default: true }
}, { strict: false });

const productSchema = new mongoose.Schema({
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    name: String
}, { strict: false });

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

async function syncRatings() {
    const logs = [];
    const log = (msg) => {
        logs.push(msg);
        console.log(msg);
    };

    try {
        await mongoose.connect(MONGODB_URI);
        log('Connected to DB');

        const allReviews = await mongoose.connection.db.collection('reviews').find({}).toArray();
        log(`DEBUG: Total raw reviews in DB collection 'reviews': ${allReviews.length}`);

        if (allReviews.length > 0) {
            log(`Sample review: ${JSON.stringify(allReviews[0], null, 2)}`);
        }

        const products = await Product.find({}).select('_id name');
        log(`Found ${products.length} products. Syncing ratings...`);

        for (const product of products) {
            // Find directly with mongoose, trust schema
            // Note: we fetch reviews regardless of visibility for debugging, but only count visible
            const reviews = await Review.find({ product: product._id });

            const visibleReviews = reviews.filter(r => r.isVisible !== false); // Default true
            const totalReviews = visibleReviews.length;
            let averageRating = 0;

            if (totalReviews > 0) {
                const sum = visibleReviews.reduce((acc, r) => acc + (r.rating || 0), 0);
                averageRating = parseFloat((sum / totalReviews).toFixed(1));
            }

            await Product.findByIdAndUpdate(product._id, {
                averageRating,
                totalReviews
            });

            log(`Updated ${product.name}: ${averageRating} stars (${totalReviews} visible reviews out of ${reviews.length})`);
        }

        log('Sync complete!');
    } catch (err) {
        log(`Error: ${err}`);
    } finally {
        fs.writeFileSync('c:\\Users\\User\\Desktop\\farmferry\\fix_ratings_log.txt', logs.join('\n'));
        process.exit(0);
    }
}

syncRatings();
