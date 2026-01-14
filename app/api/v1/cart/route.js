import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Cart from "@/models/Cart";
import Product from "@/models/Product";
import { authenticate } from "@/middlewares/auth.middleware";

export async function GET(req) {
  try {
    await dbConnect();

    const authResult = await authenticate(req);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const userId = authResult.user._id;

    // 🔥 Ensure populate works
    const cart = await Cart.findOne({ userId })
      .populate({
        path: "items.productId",
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
      const p = item.productId; // populated product

      return {
        _id: item._id, // Cart item ID
        productId: p?._id?.toString(),
        quantity: item.quantity,
        product: {
          _id: p?._id?.toString(),
          name: p?.name,
          price: p?.price,
          unit: p?.unit,
          images: p?.images || [], // Ensure images array exists
          image:
            p?.images?.[0]?.url ||
            p?.image ||
            "/images/placeholder-product.png",
          stockQuantity: p?.stockQuantity,
          gst: p?.gst
        },
        price: p?.price,
        discountedPrice: p?.discountedPrice
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
 * body: { productId, quantity }
 * Adds item (or increases quantity if exists)
 */
export async function POST(request) {
  await dbConnect();
  try {
    const authResult = await authenticate(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const userId = authResult.user._id;
    const body = await request.json();

    // DEBUG LOGGING
    const fs = require('fs');
    fs.appendFileSync('cart_debug.log', `[${new Date().toISOString()}] POST /cart Body: ${JSON.stringify(body)} | User: ${userId}\n`);

    console.log("POST /api/cart body:", body);

    const productId = body.productId;
    const quantity = Math.max(1, parseInt(body.quantity || "1", 10));

    if (!productId) return NextResponse.json({ success: false, error: "productId required" }, { status: 400 });

    const product = await Product.findById(productId).lean();
    if (!product) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });

    // If quantity > stock, enforce limit (optional)
    if (product.stockQuantity != null && quantity > product.stockQuantity) {
      return NextResponse.json({ success: false, error: "Requested quantity exceeds available stock" }, { status: 400 });
    }

    // Upsert cart
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      const item = {
        productId,
        quantity,
        name: product.name,
        price: product.price,
        thumbnail: product.images?.[0]?.url || "",
        unit: product.unit
      };
      const newCart = new Cart({ userId, items: [item], subtotal: product.price * quantity, updatedAt: new Date() });
      await newCart.save();

      // Populate for response consistency
      await newCart.populate({ path: "items.productId", model: Product });

      return NextResponse.json({ success: true, data: newCart }, { status: 201 });
    }

    // if exists, update qty, else push
    const existingIndex = cart.items.findIndex(i => String(i.productId) === String(productId));
    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += quantity;
      // clamp to stock if needed
      if (product.stockQuantity != null && cart.items[existingIndex].quantity > product.stockQuantity) {
        cart.items[existingIndex].quantity = product.stockQuantity;
      }
    } else {
      cart.items.push({
        productId,
        quantity,
        name: product.name,
        price: product.price,
        thumbnail: product.images?.[0]?.url || "",
        unit: product.unit
      });
    }

    // recalc subtotal
    // Note: Ideally we should fetch current prices to recalc subtotal to avoid stale prices
    cart.subtotal = cart.items.reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 0), 0);
    cart.updatedAt = new Date();
    await cart.save();

    await cart.populate({ path: "items.productId", model: Product });

    return NextResponse.json({ success: true, data: cart });
  } catch (err) {
    const fs = require('fs');
    fs.appendFileSync('cart_debug.log', `[${new Date().toISOString()}] ERROR: ${err.message}\nStack: ${err.stack}\n`);
    console.error("POST /api/cart error", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/cart
 * body: { productId, quantity }  -- set quantity (if quantity === 0 remove)
 */
export async function PATCH(request) {
  await dbConnect();
  try {
    const authResult = await authenticate(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const userId = authResult.user._id;
    const body = await request.json();

    console.log("PATCH /api/cart body:", body);

    const productId = body.productId;
    if (!productId) return NextResponse.json({ success: false, error: "productId required" }, { status: 400 });

    const qty = typeof body.quantity !== "undefined" ? parseInt(body.quantity, 10) : null;
    if (qty != null && qty < 0) return NextResponse.json({ success: false, error: "Invalid quantity" }, { status: 400 });

    const cart = await Cart.findOne({ userId });
    if (!cart) return NextResponse.json({ success: false, error: "Cart not found" }, { status: 404 });

    const idx = cart.items.findIndex(i => String(i.productId) === String(productId));
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
    } else if (body.increment) {
      cart.items[idx].quantity += 1;
    } else if (body.decrement) {
      cart.items[idx].quantity = Math.max(1, cart.items[idx].quantity - 1);
    } else {
      return NextResponse.json({ success: false, error: "No update action specified" }, { status: 400 });
    }

    cart.subtotal = cart.items.reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 0), 0);
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
 * body or query: { productId }  -- removes a product from cart
 * if no productId -> clears cart
 */
export async function DELETE(request) {
  await dbConnect();
  try {
    const authResult = await authenticate(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const userId = authResult.user._id;

    const url = new URL(request.url);
    const queryProduct = url.searchParams.get("productId");
    let body = {};
    try { body = await request.json(); } catch (e) { }

    const productId = body.productId || queryProduct;

    const cart = await Cart.findOne({ userId });
    if (!cart) return NextResponse.json({ success: true, data: { userId, items: [] } });

    if (!productId) {
      // clear cart
      cart.items = [];
      cart.subtotal = 0;
    } else {
      cart.items = cart.items.filter(i => String(i.productId) !== String(productId));
      cart.subtotal = cart.items.reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 0), 0);
    }

    cart.updatedAt = new Date();
    await cart.save();
    return NextResponse.json({ success: true, data: cart });
  } catch (err) {
    console.error("DELETE /api/cart error", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
