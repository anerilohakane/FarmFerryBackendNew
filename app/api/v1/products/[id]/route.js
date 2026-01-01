import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Category from "@/models/Category";
import Product from "@/models/Product";

/** Validate ObjectId */
function isValidObjectIdString(id) {
  return typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
}

/* -------------------------------------------------------
   GET /api/products/:id
------------------------------------------------------- */
export async function GET(request, { params }) {
  await dbConnect();

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Product id missing" },
        { status: 400 }
      );
    }

    let product = null;

    if (isValidObjectIdString(id)) {
      product = await Product.findById(id).lean();
    }

    if (!product) {
      product = await Product.findOne({
        $or: [{ slug: id }, { sku: id }],
      }).lean();
    }

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    let category = null;
    if (product.categoryId && isValidObjectIdString(String(product.categoryId))) {
      const cat = await Category.findById(product.categoryId)
        .select("_id name slug image parent")
        .lean();

      if (cat) {
        category = {
          id: String(cat._id),
          name: cat.name,
          slug: cat.slug ?? null,
          image: cat.image ?? null,
          parent: cat.parent ?? null,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: { ...product, category },
    });
  } catch (err) {
    console.error("GET /api/products/[id] error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------
   PUT /api/products/:id
------------------------------------------------------- */
export async function PUT(request, { params }) {
  await dbConnect();

  try {
    const { id } = await params;

    if (!isValidObjectIdString(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid product id" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const updated = await Product.findByIdAndUpdate(id, body, {
      new: true,
      overwrite: true,
      runValidators: true,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("PUT /api/products/[id] error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------
   PATCH /api/products/:id
------------------------------------------------------- */
export async function PATCH(request, { params }) {
  await dbConnect();

  try {
    const { id } = await params;

    if (!isValidObjectIdString(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid product id" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const updated = await Product.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("PATCH /api/products/[id] error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------
   DELETE /api/products/:id
------------------------------------------------------- */
export async function DELETE(request, { params }) {
  await dbConnect();

  try {
    const { id } = await params;

    if (!isValidObjectIdString(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid product id" },
        { status: 400 }
      );
    }

    const deleted = await Product.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: deleted });
  } catch (err) {
    console.error("DELETE /api/products/[id] error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
