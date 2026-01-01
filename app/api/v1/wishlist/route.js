import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Product from "@/models/Product";
import Wishlists from "@/models/Wishlists";

/* ---------------- GET ---------------- */
export async function GET(request) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const customer = searchParams.get("customer");

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "customer required" },
        { status: 400 }
      );
    }

    const wishlistData = await Wishlists.findOne({ customer })
      .populate("items.product", "name price images")
      .lean();

    return NextResponse.json({
      success: true,
      data: wishlistData || { customer, items: [] },
    });
  } catch (err) {
    console.error("GET /api/wishlist error", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/* ---------------- POST (ADD / TOGGLE) ---------------- */
export async function POST(request) {
  await dbConnect();

  try {
    const { customer, product } = await request.json();

    if (!customer || !product) {
      return NextResponse.json(
        { success: false, error: "customer and product required" },
        { status: 400 }
      );
    }

    const p = await Product.findById(product).lean();
    if (!p) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const snapshot = {
      product,
      name: p.name,
      price: p.price,
      thumbnail: p.images?.[0]?.url || "",
    };

    const wishlistData = await Wishlists.findOneAndUpdate(
      { customer },
      { $addToSet: { items: snapshot } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, data: wishlistData });
  } catch (err) {
    console.error("POST /api/wishlist error", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}


/* ---------------- DELETE ---------------- */
export async function DELETE(request) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    let body = {};
    try {
      body = await request.json();
    } catch {}

    const customer = body.customer || searchParams.get("customer");
    const product = body.product || searchParams.get("product");

    if (!customer || !product) {
      return NextResponse.json(
        { success: false, error: "customer and product required" },
        { status: 400 }
      );
    }

    const wishlistData = await Wishlists.findOneAndUpdate(
      { customer },
      { $pull: { items: { product } } },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      data: wishlistData || { customer, items: [] },
    });
  } catch (err) {
    console.error("DELETE /api/wishlist error", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
