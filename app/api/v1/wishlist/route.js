import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Wishlist from "@/lib/db/models/wishlist";
import Product from "@/lib/db/models/product";
// Optional: import getUserFromRequest to derive user from token
// import { getUserFromRequest } from "@/lib/serverAuth";

function getUserIdFromRequest(request) {
  // Use auth if implemented. For now allow query param for testing.
  const url = new URL(request.url);
  const q = url.searchParams.get("userId");
  if (q) return q;
  // else try body (for non-GET requests)
  return null;
}

export async function GET(request) {
  await dbConnect();
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    if (!userId) return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });

    const wishlist = await Wishlist.findOne({ userId }).lean();
    return NextResponse.json({ success: true, data: wishlist || { userId, items: [] } });
  } catch (err) {
    console.error("GET /api/wishlist error", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/wishlist
 * body: { userId (optional if using auth), productId }
 */
export async function POST(request) {
  await dbConnect();
  try {
    const body = await request.json();
    const userId = body.userId || getUserIdFromRequest(request);
    const productId = body.productId;
    if (!userId || !productId) return NextResponse.json({ success: false, error: "userId and productId required" }, { status: 400 });

    // Validate product exists
    const product = await Product.findById(productId).lean();
    if (!product) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });

    const snapshot = { productId, addedAt: new Date(), name: product.name, price: product.price, thumbnail: product.images?.[0]?.url || "" };

    const updated = await Wishlist.findOneAndUpdate(
      { userId },
      { $pull: { items: { productId } } }, // ensure no dup
      { upsert: false }
    );

    // push (if not exists)
    const res = await Wishlist.findOneAndUpdate(
      { userId, "items.productId": { $ne: productId } },
      { $push: { items: snapshot } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true, data: res });
  } catch (err) {
    console.error("POST /api/wishlist error", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/wishlist
 * body: { userId, productId }  OR query params for GET/DELETE
 */
export async function DELETE(request) {
  await dbConnect();
  try {
    const url = new URL(request.url);
    const queryUser = url.searchParams.get("userId");
    const queryProduct = url.searchParams.get("productId");

    let body = {};
    try { body = await request.json(); } catch(e) { /* ignore empty body */ }

    const userId = body.userId || queryUser;
    const productId = body.productId || queryProduct;
    if (!userId || !productId) return NextResponse.json({ success: false, error: "userId and productId required" }, { status: 400 });

    const updated = await Wishlist.findOneAndUpdate(
      { userId },
      { $pull: { items: { productId } } },
      { new: true }
    ).select("-__v");

    return NextResponse.json({ success: true, data: updated || { userId, items: [] } });
  } catch (err) {
    console.error("DELETE /api/wishlist error", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
