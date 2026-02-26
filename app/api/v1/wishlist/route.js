import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Wishlist from "@/models/Wishlists";
import Product from "@/models/Product";

// Helper to get userId (Customer ID) from request
function getUserIdFromRequest(request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("userId");
  if (q) return q;
  return null;
}

export async function GET(request) {
  await dbConnect();
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ success: false, message: "userId required" }, { status: 400 });
    }

    // Schema uses 'customer', not 'userId'
    let wishlist = await Wishlist.findOne({ customer: userId }).populate("items.product").lean();

    if (!wishlist) {
      wishlist = { customer: userId, items: [] };
    }

    return NextResponse.json({ success: true, data: wishlist });
  } catch (err) {
    console.error("GET /api/wishlist error", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  await dbConnect();
  try {
    const body = await request.json();
    const userId = body.userId || getUserIdFromRequest(request);
    const productId = body.productId;

    if (!userId || !productId) {
      return NextResponse.json({ success: false, message: "userId and productId required" }, { status: 400 });
    }

    // Validate product exists
    const product = await Product.findById(productId).lean();
    if (!product) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    // Prepare item snapshot matching Schema
    const itemSnapshot = {
      product: productId, // Schema expects 'product' (ObjectId)
      addedAt: new Date(),
      name: product.name,
      price: product.price,
      thumbnail: product.images?.[0]?.url || ""
    };

    // Find wishlist for customer
    let wishlist = await Wishlist.findOne({ customer: userId });

    if (!wishlist) {
      // Create new wishlist if it doesn't exist
      wishlist = new Wishlist({
        customer: userId,
        items: [itemSnapshot]
      });
      await wishlist.save();
    } else {
      // Check if item already exists to avoid duplicates
      const itemExists = wishlist.items.some(item => item.product.toString() === productId);

      if (!itemExists) {
        wishlist.items.push(itemSnapshot);
        await wishlist.save();
      } else {
        // If it exists, we might want to toggle (remove) or just do nothing.
        // But the frontend usually calls DELETE to remove. 
        // So here we ensure it IS added. 
        // If we want to support toggle in one endpoint, we'd check flag, but current architecture splits add/remove.
        // We'll just return the existing list.
      }
    }

    return NextResponse.json({ success: true, data: wishlist });
  } catch (err) {
    console.error("POST /api/wishlist error", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

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

    if (!userId || !productId) {
      return NextResponse.json({ success: false, message: "userId and productId required" }, { status: 400 });
    }

    const updated = await Wishlist.findOneAndUpdate(
      { customer: userId },
      { $pull: { items: { product: productId } } },
      { new: true }
    ).select("-__v");

    return NextResponse.json({ success: true, data: updated || { customer: userId, items: [] } });
  } catch (err) {
    console.error("DELETE /api/wishlist error", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
