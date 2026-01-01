import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Cart from "@/models/Cart";
import Product from "@/models/Product";

export async function GET(req) {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const customer = searchParams.get("customer");

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "customer required" },
        { status: 400 }
      );
    }

    const cart = await Cart.findOne({ customer })
      .populate("items.product")
      .lean();

    if (!cart) {
      return NextResponse.json({
        success: true,
        data: { customer, items: [], subtotal: 0 },
      });
    }

    return NextResponse.json({ success: true, data: cart });
  } catch (err) {
    console.error("GET /api/cart error", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  await dbConnect();

  try {
    const {
      customer,
      product,
      quantity = 1,
      variation,
    } = await request.json();

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

    let cart = await Cart.findOne({ customer });
    if (!cart) cart = new Cart({ customer, items: [] });

    cart.addItem(
      product,
      quantity,
      p.price,
      p.discountedPrice,
      variation
    );

    await cart.save();
    return NextResponse.json({ success: true, data: cart });
  } catch (err) {
    console.error("POST /api/cart error", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}


export async function PATCH(request) {
  await dbConnect();

  try {
    const { customer, itemId, quantity } =
      await request.json();

    if (!customer || !itemId) {
      return NextResponse.json(
        { success: false, error: "customer and itemId required" },
        { status: 400 }
      );
    }

    const cart = await Cart.findOne({ customer });
    if (!cart) {
      return NextResponse.json(
        { success: false, error: "Cart not found" },
        { status: 404 }
      );
    }

    cart.updateItemQuantity(itemId, quantity);
    await cart.save();

    return NextResponse.json({ success: true, data: cart });
  } catch (err) {
    console.error("PATCH /api/cart error", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  await dbConnect();

  try {
    const { customer, itemId } = await request.json();

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "customer required" },
        { status: 400 }
      );
    }

    const cart = await Cart.findOne({ customer });
    if (!cart) {
      return NextResponse.json({ success: true });
    }

    if (itemId) {
      cart.items.pull(itemId);
    } else {
      cart.clearCart();
    }

    await cart.save();
    return NextResponse.json({ success: true, data: cart });
  } catch (err) {
    console.error("DELETE /api/cart error", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
