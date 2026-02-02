import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Cart from "@/models/Cart";
import Product from "@/models/Product";

export async function GET(req) {
  try {
    await dbConnect();

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId required" },
        { status: 400 }
      );
    }

    // 🔥 Ensure populate works - use 'customer' field
    const cart = await Cart.findOne({ customer: userId })
      .populate({
        path: "items.product",  // Changed from items.productId to items.product
        model: Product,
      })
      .exec();

    if (!cart) {
      return NextResponse.json({
        success: true,
        data: { userId, items: [], subtotal: 0 },
      });
    }

    // 🔥 Format items cleanly for frontend
    const formattedItems = cart.items.map((item) => {
      const p = item.product; // populated product (changed from item.productId)

      return {
        productId: p?._id?.toString(),
        quantity: item.quantity,
        product: {
          id: p?._id?.toString(),
          name: p?.name,
          price: p?.price,
          unit: p?.unit,
          image:
            p?.images?.[0]?.url ||
            p?.image ||
            "/images/placeholder-product.png",
          stockQuantity: p?.stockQuantity,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        userId,
        items: formattedItems,
        subtotal: cart.subtotal,
      },
    });
  } catch (err) {
    console.error("GET /api/cart error", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cart
 * body: { userId, productId, quantity }
 * Adds item (or increases quantity if exists)
 */
export async function POST(request) {
  await dbConnect();
  try {
    const body = await request.json();

    console.log(body);

    const userId = body.userId;
    const productId = body.productId;
    const quantity = Math.max(1, parseInt(body.quantity || "1", 10));

    if (!userId || !productId) return NextResponse.json({ success: false, error: "userId and productId required" }, { status: 400 });

    const product = await Product.findById(productId).lean();
    if (!product) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });

    // If quantity > stock, enforce limit (optional)
    if (product.stockQuantity != null && quantity > product.stockQuantity) {
      return NextResponse.json({ success: false, error: "Requested quantity exceeds available stock" }, { status: 400 });
    }

    // Determine unit price (use discounted price if available)
    const unitPrice = product.discountedPrice || product.price;

    // Upsert cart - use 'customer' field to match Cart schema
    const cart = await Cart.findOne({ customer: userId });
    if (!cart) {
      const item = {
        product: productId,  // Changed from productId to product
        quantity,
        price: product.price,
        discountedPrice: product.discountedPrice,
        totalPrice: unitPrice * quantity,  // Added required totalPrice
      };
      const newCart = new Cart({
        customer: userId,  // Changed from userId to customer
        items: [item],
        subtotal: unitPrice * quantity,
        updatedAt: new Date()
      });
      await newCart.save();
      return NextResponse.json({ success: true, data: newCart }, { status: 201 });
    }

    // if exists, update qty, else push
    const existingIndex = cart.items.findIndex(i => String(i.product) === String(productId));
    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += quantity;
      // clamp to stock if needed
      if (product.stockQuantity != null && cart.items[existingIndex].quantity > product.stockQuantity) {
        cart.items[existingIndex].quantity = product.stockQuantity;
      }
      // Recalculate totalPrice
      cart.items[existingIndex].totalPrice = cart.items[existingIndex].quantity * unitPrice;
    } else {
      cart.items.push({
        product: productId,  // Changed from productId to product
        quantity,
        price: product.price,
        discountedPrice: product.discountedPrice,
        totalPrice: unitPrice * quantity,  // Added required totalPrice
      });
    }

    // recalc subtotal
    cart.subtotal = cart.items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);
    cart.updatedAt = new Date();
    await cart.save();

    return NextResponse.json({ success: true, data: cart });
  } catch (err) {
    console.error("POST /api/cart error", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/cart
 * body: { userId, productId, quantity }  -- set quantity (if quantity === 0 remove)
 */
export async function PATCH(request) {
  await dbConnect();
  try {
    const body = await request.json();

    console.log(body);

    const userId = body.userId;
    const productId = body.productId;
    if (!userId || !productId) return NextResponse.json({ success: false, error: "userId and productId required" }, { status: 400 });

    const qty = typeof body.quantity !== "undefined" ? parseInt(body.quantity, 10) : null;
    if (qty != null && qty < 0) return NextResponse.json({ success: false, error: "Invalid quantity" }, { status: 400 });

    const cart = await Cart.findOne({ customer: userId });  // Changed from userId to customer
    if (!cart) return NextResponse.json({ success: false, error: "Cart not found" }, { status: 404 });

    const idx = cart.items.findIndex(i => String(i.product) === String(productId));  // Changed from i.productId to i.product
    if (idx === -1) return NextResponse.json({ success: false, error: "Item not in cart" }, { status: 404 });

    if (qty === 0) {
      cart.items.splice(idx, 1);
    } else if (qty != null) {
      // Check stock if needed
      const product = await Product.findById(productId).lean();
      if (product && product.stockQuantity != null && qty > product.stockQuantity) {
        return NextResponse.json({ success: false, error: "Requested quantity exceeds available stock" }, { status: 400 });
      }
      cart.items[idx].quantity = qty;
      cart.items[idx].totalPrice = qty * (cart.items[idx].discountedPrice ?? cart.items[idx].price);
    } else if (body.increment) {
      cart.items[idx].quantity += 1;
      cart.items[idx].totalPrice = cart.items[idx].quantity * (cart.items[idx].discountedPrice ?? cart.items[idx].price);
    } else if (body.decrement) {
      cart.items[idx].quantity = Math.max(1, cart.items[idx].quantity - 1);
      cart.items[idx].totalPrice = cart.items[idx].quantity * (cart.items[idx].discountedPrice ?? cart.items[idx].price);
    } else {
      return NextResponse.json({ success: false, error: "No update action specified" }, { status: 400 });
    }

    cart.subtotal = cart.items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);  // Use totalPrice instead of price * quantity
    cart.updatedAt = new Date();
    await cart.save();
    return NextResponse.json({ success: true, data: cart });
  } catch (err) {
    console.error("PATCH /api/cart error", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/cart
 * body or query: { userId, productId }  -- removes a product from cart
 * if only userId provided and no productId -> clears cart
 */
export async function DELETE(request) {
  await dbConnect();
  try {
    const url = new URL(request.url);
    const queryUser = url.searchParams.get("userId");
    const queryProduct = url.searchParams.get("productId");
    let body = {};
    try { body = await request.json(); } catch (e) { }

    const userId = body.userId || queryUser;
    const productId = body.productId || queryProduct;

    if (!userId) return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });

    const cart = await Cart.findOne({ customer: userId });  // Changed from userId to customer
    if (!cart) return NextResponse.json({ success: true, data: { userId, items: [] } });

    if (!productId) {
      // clear cart
      cart.items = [];
      cart.subtotal = 0;
    } else {
      cart.items = cart.items.filter(i => String(i.product) !== String(productId));  // Changed from i.productId to i.product
      cart.subtotal = cart.items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);  // Use totalPrice
    }

    cart.updatedAt = new Date();
    await cart.save();
    return NextResponse.json({ success: true, data: cart });
  } catch (err) {
    console.error("DELETE /api/cart error", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

