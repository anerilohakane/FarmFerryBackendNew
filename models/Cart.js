import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
    },
    discountedPrice: {
      type: Number,
    },
    variation: {
      name: String,
      value: String,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    subtotal: {
      type: Number,
      default: 0,
    },
    coupon: {
      code: String,
      type: { type: String, enum: ["percentage", "fixed"] },
      value: Number,
      discount: { type: Number, default: 0 },
    },
    discount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

/* ---------- AUTO SUBTOTAL ---------- */
cartSchema.pre("save", function () {
  this.subtotal = this.items.reduce(
    (sum, item) => sum + item.totalPrice,
    0
  );
});

/* ---------- METHODS ---------- */
cartSchema.methods.addItem = function (
  productId,
  quantity,
  price,
  discountedPrice,
  variation
) {
  const unitPrice = discountedPrice ?? price;

  const existing = this.items.find(
    (i) =>
      i.product.toString() === productId.toString() &&
      JSON.stringify(i.variation || {}) === JSON.stringify(variation || {})
  );

  if (existing) {
    existing.quantity += quantity;
    existing.totalPrice = existing.quantity * unitPrice;
  } else {
    this.items.push({
      product: productId,
      quantity,
      price,
      discountedPrice,
      variation,
      totalPrice: quantity * unitPrice,
    });
  }

  return this;
};

cartSchema.methods.updateItemQuantity = function (itemId, quantity) {
  const item = this.items.id(itemId);
  if (!item) throw new Error("Cart item not found");

  if (quantity <= 0) {
    this.items.pull(itemId);
  } else {
    item.quantity = quantity;
    item.totalPrice =
      quantity * (item.discountedPrice ?? item.price);
  }

  return this;
};

cartSchema.methods.clearCart = function () {
  this.items = [];
  this.subtotal = 0;
  return this;
};

const Cart =
  mongoose.models.Cart || mongoose.model("Cart", cartSchema);

export default Cart;
