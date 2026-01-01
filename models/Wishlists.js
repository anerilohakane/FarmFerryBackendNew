// models/Wishlist.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const wishlistItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    name: String,
    price: Number,
    thumbnail: String,
  },
  { _id: false }
);

const wishlistSchema = new Schema(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      unique: true,
      index: true,
    },
    items: {
      type: [wishlistItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

delete mongoose.models.Wishlist;
export default mongoose.models.Wishlist ||
  mongoose.model("Wishlist", wishlistSchema);

  