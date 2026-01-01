import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Category from "@/models/Category";
import Product from "@/models/Product";

function isValidObjectIdString(id) {
  return typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
}

const DEFAULT_LIMIT = 20;

export async function GET(request) {
  await dbConnect();

  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, parseInt(url.searchParams.get("limit") || String(DEFAULT_LIMIT), 10));
    const q = url.searchParams.get("q");
    const categoryId = url.searchParams.get("categoryId");
    const supplierId = url.searchParams.get("supplierId");
    const isActive = url.searchParams.get("isActive");
    const sort = url.searchParams.get("sort") || "-createdAt";
    const sku = url.searchParams.get("sku");

    const filter = {};

    if (q) filter.name = { $regex: q, $options: "i" };

    // If categoryId is provided, accept either objectId or slug/name.
    if (categoryId) {
      if (isValidObjectIdString(categoryId)) {
        filter.categoryId = categoryId;
      } else {
        // try to find category by slug or name (case-insensitive)
        const cat = await Category.findOne({ $or: [{ slug: categoryId }, { name: { $regex: `^${categoryId}$`, $options: "i" } }] }).lean();
        if (cat) filter.categoryId = String(cat._id);
        else {
          // no matching category — return empty result set (avoid server error)
          return NextResponse.json({
            success: true,
            data: { items: [], pagination: { total: 0, page, limit, pages: 0 } }
          });
        }
      }
    }

    if (supplierId) filter.supplierId = supplierId;
    if (isActive === "true") filter.isActive = true;
    if (isActive === "false") filter.isActive = false;

    if (sku) {
      filter.$or = [{ sku }, { "variations.sku": sku }];
    }

    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    // populate category info client-side friendly (map)
    const categoryIds = Array.from(new Set(items.map(i => String(i.categoryId)).filter(Boolean)));
    const categories = categoryIds.length ? await Category.find({ _id: { $in: categoryIds } }).select('_id name image slug').lean() : [];
    const categoryMap = new Map(categories.map(c => [String(c._id), c]));

    const itemsWithCategory = items.map(item => {
      const cat = categoryMap.get(String(item.categoryId)) || null;
      return {
        ...item,
        category: cat ? { id: String(cat._id), name: cat.name, image: cat.image ?? null, slug: cat.slug ?? null } : null
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        items: itemsWithCategory,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (err) {
    console.error("GET /api/products error:", err);
    if (err && err.stack) console.error(err.stack);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  await dbConnect();

  try {
    const body = await request.json();

    // Basic server-side validation
    if (!body.name || body.price == null || body.stockQuantity == null || !body.images || !Array.isArray(body.images) || body.images.length === 0) {
      return NextResponse.json({ success: false, error: "Missing required fields (name, price, stockQuantity, images[])." }, { status: 400 });
    }

    // Ensure category exists and set categoryId properly
    let resolvedCategoryId = null;
    if (body.categoryId) {
      if (isValidObjectIdString(String(body.categoryId))) {
        const cat = await Category.findById(String(body.categoryId)).lean();
        if (!cat) {
          return NextResponse.json({ success: false, error: "categoryId not found" }, { status: 400 });
        }
        resolvedCategoryId = String(cat._id);
      } else {
        // try slug or exact name match
        const maybe = String(body.categoryId).trim();
        const cat = await Category.findOne({ $or: [{ slug: maybe }, { name: { $regex: `^${maybe}$`, $options: "i" } }] }).lean();
        if (!cat) {
          return NextResponse.json({ success: false, error: "category not found by slug/name" }, { status: 400 });
        }
        resolvedCategoryId = String(cat._id);
      }
    } else if (body.category) {
      // Accept "category" (name/slug) as fallback
      const maybe = String(body.category).trim();
      const cat = await Category.findOne({ $or: [{ slug: maybe }, { name: { $regex: `^${maybe}$`, $options: "i" } }] }).lean();
      if (cat) resolvedCategoryId = String(cat._id);
    }

    if (!resolvedCategoryId) {
      return NextResponse.json({ success: false, error: "Product must include a valid categoryId (or category slug/name)" }, { status: 400 });
    }

    // Optional: if client supplied SKUs, check for conflicts before attempting to save
    const skusToCheck = [];
    if (body.sku) skusToCheck.push(body.sku);
    if (Array.isArray(body.variations)) {
      body.variations.forEach(v => {
        if (v && v.sku) skusToCheck.push(v.sku);
      });
    }

    if (skusToCheck.length) {
      const conflict = await Product.findOne({
        $or: [{ sku: { $in: skusToCheck } }, { "variations.sku": { $in: skusToCheck } }]
      }).lean();
      if (conflict) {
        return NextResponse.json({ success: false, error: "SKU conflict", details: { conflictProductId: conflict._id } }, { status: 409 });
      }
    }

    // Build payload (ensure categoryId is set)
    const payload = {
      ...body,
      categoryId: resolvedCategoryId,
    };

    // Create product; Product model's pre-save hook will auto-generate SKUs if missing
    const product = new Product(payload);
    await product.save();

    // populate category basic info for response
    const cat = await Category.findById(resolvedCategoryId).select('_id name image slug').lean();

    const result = {
      ...product.toObject(),
      category: cat ? { id: String(cat._id), name: cat.name, image: cat.image ?? null, slug: cat.slug ?? null } : null
    };

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err) {
    console.error("POST /api/products error:", err);
    if (err && err.stack) console.error(err.stack);

    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map(e => e.message);
      return NextResponse.json({ success: false, error: "Validation failed", details: errors }, { status: 400 });
    }
    if (err.code === 11000) {
      return NextResponse.json({ success: false, error: "Duplicate key error", details: err.keyValue }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
