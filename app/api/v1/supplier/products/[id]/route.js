import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Category from "@/models/Category";
import Product from "@/models/Product";
import Notification from "@/models/Notification";
import { authenticate } from "@/middlewares/auth.middleware"; // Generic auth
import cloudinary from "@/lib/cloudinary";

function isValidObjectIdString(id) {
  return typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
}

// GET SINGLE
export async function GET(request, { params }) {
  await dbConnect();

  /* ------------------ AUTH ------------------ */
  const authResult = await authenticateSupplier(request);

  if (!authResult.success) {
    return NextResponse.json(
      { success: false, message: authResult.error },
      { status: authResult.statusCode }
    );
  }

  const user = authResult.user;

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

    // Security: If supplier, ensure they own the product
    if (user.role === "supplier" && String(product.supplierId) !== String(user._id)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access to this product" },
        { status: 403 }
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
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* -------------------------------------------------------
   PUT /api/products/:id
------------------------------------------------------- */
export async function PUT(request, { params }) {
  await dbConnect();

  /* ------------------ AUTH ------------------ */
  const authResult = await authenticateSupplier(request);

  if (!authResult.success) {
    return NextResponse.json(
      { success: false, message: authResult.error },
      { status: authResult.statusCode }
    );
  }

  const user = authResult.user;

  try {
    const { id } = await params;

    if (!isValidObjectIdString(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid product id" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // if supplier, force supplierId to ensure they don't change ownership
    if (user.role === "supplier") {
      body.supplierId = user._id; // Use user._id (from model), not user.supplierId
    }

    // Ensure the product belongs to the supplier BEFORE updating
    const existingProduct = await Product.findOne({ _id: id });
    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    if (user.role === "supplier" && String(existingProduct.supplierId) !== String(user._id)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized to update this product" },
        { status: 403 }
      );
    }

    const updated = await Product.findByIdAndUpdate(
      id,
      body,
      {
        new: true,
        runValidators: true,
      }
    );

    return NextResponse.json({ success: true, data: updated });

    /* ------------------ NOTIFICATION CHECK ------------------ */
    if (updated.stockQuantity <= 10) {
      const recentNotif = await Notification.findOne({
        recipient: user._id,
        referenceId: updated._id,
        type: "LOW_STOCK",
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      if (!recentNotif) {
        await Notification.create({
          recipient: user._id,
          recipientType: "supplier",
          title: "Low Stock Alert",
          message: `Your product "${updated.name}" is running low on stock (${updated.stockQuantity} remaining).`,
          type: "LOW_STOCK",
          referenceId: updated._id
        });
      }
    }
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

  /* ------------------ AUTH ------------------ */
  const authResult = await authenticateSupplier(request);

  if (!authResult.success) {
    return NextResponse.json(
      { success: false, message: authResult.error },
      { status: authResult.statusCode }
    );
  }

  const user = authResult.user;

  try {
    const { id } = await params;

    if (!isValidObjectIdString(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid product id" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // if supplier, force supplierId
    if (user.role === "supplier") {
      body.supplierId = user._id;
    }

    // Ensure the product belongs to the supplier BEFORE updating
    const existingProduct = await Product.findOne({ _id: id });
    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    if (user.role === "supplier" && String(existingProduct.supplierId) !== String(user._id)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized to update this product" },
        { status: 403 }
      );
    }

    const updated = await Product.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    return NextResponse.json({ success: true, data: updated });

    /* ------------------ NOTIFICATION CHECK ------------------ */
    if (updated.stockQuantity <= 10) {
      const recentNotif = await Notification.findOne({
        recipient: user._id,
        referenceId: updated._id,
        type: "LOW_STOCK",
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      if (!recentNotif) {
        await Notification.create({
          recipient: user._id,
          recipientType: "supplier",
          title: "Low Stock Alert",
          message: `Your product "${updated.name}" is running low on stock (${updated.stockQuantity} remaining).`,
          type: "LOW_STOCK",
          referenceId: updated._id
        });
      }
    }
  } catch (err) {
    console.error("PATCH /api/products/[id] error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  await dbConnect();

  /* ------------------ AUTH ------------------ */
  const authResult = await authenticateSupplier(request);

  if (!authResult.success) {
    return NextResponse.json(
      { success: false, message: authResult.error },
      { status: authResult.statusCode }
    );
  }

  const user = authResult.user;

  try {
    const { id } = await params;

    if (!isValidObjectIdString(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid product id" },
        { status: 400 }
      );
    }

    // Ensure the product belongs to the supplier BEFORE deleting
    const existingProduct = await Product.findOne({ _id: id });
    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    if (user.role === "supplier" && String(existingProduct.supplierId) !== String(user._id)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized to delete this product" },
        { status: 403 }
      );
    }

    const deleted = await Product.findByIdAndDelete(id);

    return NextResponse.json({ success: true, data: deleted });
  } catch (err) {
    console.error("DELETE /api/products/[id] error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
