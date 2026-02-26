import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order"
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: 1,
      max: 5
    },
    title: {
      type: String,
      trim: true
    },
    comment: {
      type: String,
      trim: true
    },
    images: [
      {
        url: { type: String },
        publicId: { type: String }
      }
    ],
    isVerified: {
      type: Boolean,
      default: false
    },
    isVisible: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    helpfulCount: {
      type: Number,
      default: 0
    },
    reportCount: {
      type: Number,
      default: 0
    },
    reply: {
      content: { type: String },
      createdAt: { type: Date },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'reply.createdByModel'
      },
      createdByModel: {
        type: String,
        enum: ["Supplier", "Admin"]
      }
    },
    customerReply: {
      content: { type: String },
      createdAt: { type: Date },
      customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer"
      }
    }
  },
  {
    timestamps: true
  }
);

// Compound index to ensure a customer can only review a product once
reviewSchema.index({ product: 1, customer: 1 }, { unique: true });

// Prevent double registration of hooks if model already exists
if (!mongoose.models.Review) {
  // Middleware to update product ratings after saving a review
  reviewSchema.post("save", async function () {
    try {
      const Product = mongoose.model("Product");

      // Find the product
      const product = await Product.findById(this.product);

      if (!product) return;

      // Find all visible reviews for this product
      // Use this.constructor to refer to the model
      const reviews = await this.constructor.find({
        product: this.product,
        isVisible: true
      });

      // Calculate new average rating
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

      // Update product
      await Product.findByIdAndUpdate(this.product, {
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews: reviews.length
      });
    } catch (err) {
      console.error("Error in Review post-save hook:", err);
    }
  });

  // Middleware to update product ratings after removing a review
  reviewSchema.post("remove", async function () {
    try {
      const Product = mongoose.model("Product");

      // Find the product
      const product = await Product.findById(this.product);

      if (!product) return;

      // Find all visible reviews for this product
      const reviews = await this.constructor.find({
        product: this.product,
        isVisible: true
      });

      // Calculate new average rating
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

      // Update product
      await Product.findByIdAndUpdate(this.product, {
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews: reviews.length
      });
    } catch (err) {
      console.error("Error in Review post-remove hook:", err);
    }
  });
}

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

export default Review;
