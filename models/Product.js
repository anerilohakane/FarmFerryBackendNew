import mongoose from "mongoose";
import { generateSKU } from "@/utils/generateSKU";

const { Schema } = mongoose;

/* ---------------- Sub Schemas ---------------- */

const imageSubSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    isMain: { type: Boolean, default: false },
  },
  { _id: false }
);

const variationSubSchema = new Schema(
  {
    name: String,
    value: String,
    additionalPrice: { type: Number, default: 0 },
    stockQuantity: { type: Number, default: 0 },
    sku: { type: String, default: null },
  },
  { _id: false }
);

/* ---------------- Product Schema ---------------- */

const productSchema = new Schema(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },

    name: { type: String, required: true, trim: true, index: true },
    description: String,

    price: { type: Number, required: true, min: 0 },
    discountedPrice: { type: Number, min: 0 },

    gst: { type: Number, default: 0, min: 0, max: 100 },
    stockQuantity: { type: Number, required: true, min: 0 },

    unit: {
      type: String,
      enum: ["kg", "g", "liters", "ml", "pcs", "box", "dozen"],
      default: "kg",
    },

    images: {
      type: [imageSubSchema],
      required: true,
      validate: v => Array.isArray(v) && v.length > 0,
    },

    variations: [variationSubSchema],

    sku: { type: String, unique: true, sparse: true },
    barcode: { type: String, unique: true, sparse: true },

    offerPercentage: { type: Number, default: 0 },
    offerStartDate: Date,
    offerEndDate: Date,
    hasActiveOffer: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* ---------------- PRE SAVE (ASYNC ONLY) ---------------- */

productSchema.pre("save", async function () {
  // ---------- Main SKU ----------
  if (!this.sku) {
    const prefix =
      this.name
        ?.replace(/[^A-Z0-9]/gi, "")
        .slice(0, 3)
        .toUpperCase() || "PRD";

    this.sku = generateSKU(prefix);
  }

  // ---------- Variation SKUs ----------
  if (Array.isArray(this.variations)) {
    this.variations.forEach((v, i) => {
      if (v && !v.sku) {
        const root = this.sku.split("-")[0];
        v.sku = generateSKU(`${root}${i + 1}`);
      }
    });
  }

  // ---------- Offer percentage ----------
  if (
    this.price > 0 &&
    this.discountedPrice != null &&
    !this.isModified("offerPercentage")
  ) {
    this.offerPercentage =
      ((this.price - this.discountedPrice) / this.price) * 100;
  }

  // ---------- Active offer ----------
  if (this.offerStartDate && this.offerEndDate) {
    const now = new Date();
    this.hasActiveOffer =
      now >= this.offerStartDate && now <= this.offerEndDate;
  } else {
    this.hasActiveOffer = this.offerPercentage > 0;
  }
});

/* ---------------- Model Export ---------------- */

const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;
