import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Category from "@/models/Category";
import Product from "@/models/Product";
import { authenticateSupplier } from "@/middlewares/auth.middleware";

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

// export async function POST(request) {
//   await dbConnect();

//   // ✅ CORRECT AUTH
//   const authResult = await authenticateSupplier(request);

//   if (!authResult.success) {
//     return NextResponse.json(
//       { success: false, error: authResult.error },
//       { status: authResult.statusCode }
//     );
//   }

//   const supplierUser = authResult.user; // ✅ real supplier

//   try {
//     const body = await request.json();

//     // ✅ FORCE supplierId FROM TOKEN
//     body.supplierId = supplierUser._id;

//     /* ------------------ VALIDATION ------------------ */
//     if (
//       !body.name ||
//       body.price == null ||
//       body.stockQuantity == null ||
//       !Array.isArray(body.images) ||
//       body.images.length === 0
//     ) {
//       return NextResponse.json(
//         { success: false, error: "Missing required fields" },
//         { status: 400 }
//       );
//     }

//     /* ------------------ CATEGORY ------------------ */
//     let resolvedCategoryId = null;

//     if (body.categoryId) {
//       if (isValidObjectIdString(body.categoryId)) {
//         const cat = await Category.findById(body.categoryId);
//         if (!cat) {
//           return NextResponse.json(
//             { success: false, error: "Invalid categoryId" },
//             { status: 400 }
//           );
//         }
//         resolvedCategoryId = cat._id.toString();
//       } else {
//         const cat = await Category.findOne({
//           $or: [
//             { slug: body.categoryId },
//             { name: new RegExp(`^${body.categoryId}$`, "i") }
//           ]
//         });

//         if (!cat) {
//           return NextResponse.json(
//             { success: false, error: "Category not found" },
//             { status: 400 }
//           );
//         }
//         resolvedCategoryId = cat._id.toString();
//       }
//     }

//     if (!resolvedCategoryId) {
//       return NextResponse.json(
//         { success: false, error: "Category is required" },
//         { status: 400 }
//       );
//     }

//     /* ------------------ SKU CHECK ------------------ */
//     const skus = [];
//     if (body.sku) skus.push(body.sku);
//     if (Array.isArray(body.variations)) {
//       body.variations.forEach(v => v?.sku && skus.push(v.sku));
//     }

//     if (skus.length) {
//       const conflict = await Product.findOne({
//         $or: [{ sku: { $in: skus } }, { "variations.sku": { $in: skus } }]
//       });

//       if (conflict) {
//         return NextResponse.json(
//           { success: false, error: "SKU conflict" },
//           { status: 409 }
//         );
//       }
//     }

//     /* ------------------ CREATE PRODUCT ------------------ */
//     const product = await Product.create({
//       ...body,
//       categoryId: resolvedCategoryId,
//       supplierId: supplierUser._id
//     });

//     return NextResponse.json(
//       { success: true, data: product },
//       { status: 201 }
//     );
//   } catch (err) {
//     console.error("POST /api/products error:", err);
//     return NextResponse.json(
//       { success: false, error: err.message },
//       { status: 500 }
//     );
//   }
// }

export async function POST(request) {
  await dbConnect();

  try {
    const body = await request.json();

    /* ------------------ BASIC VALIDATION ------------------ */
    if (
      !body.name ||
      body.price == null ||
      body.stockQuantity == null ||
      !Array.isArray(body.images) ||
      body.images.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    /* ------------------ CATEGORY RESOLUTION ------------------ */
    let resolvedCategoryId = null;

    if (body.categoryId) {
      if (isValidObjectIdString(String(body.categoryId))) {
        const cat = await Category.findById(body.categoryId).lean();
        if (!cat) {
          return NextResponse.json(
            { success: false, error: "Invalid categoryId" },
            { status: 400 }
          );
        }
        resolvedCategoryId = String(cat._id);
      } else {
        const cat = await Category.findOne({
          $or: [
            { slug: body.categoryId },
            { name: new RegExp(`^${body.categoryId}$`, "i") }
          ]
        }).lean();

        if (!cat) {
          return NextResponse.json(
            { success: false, error: "Category not found" },
            { status: 400 }
          );
        }
        resolvedCategoryId = String(cat._id);
      }
    }

    if (!resolvedCategoryId) {
      return NextResponse.json(
        { success: false, error: "Category is required" },
        { status: 400 }
      );
    }

    /* ------------------ SKU CONFLICT CHECK ------------------ */
    const skus = [];
    if (body.sku) skus.push(body.sku);
    if (Array.isArray(body.variations)) {
      body.variations.forEach(v => v?.sku && skus.push(v.sku));
    }

    if (skus.length) {
      const conflict = await Product.findOne({
        $or: [{ sku: { $in: skus } }, { "variations.sku": { $in: skus } }]
      });

      if (conflict) {
        return NextResponse.json(
          { success: false, error: "SKU conflict" },
          { status: 409 }
        );
      }
    }

    /* ------------------ CREATE PRODUCT ------------------ */
    const product = await Product.create({
      ...body,
      categoryId: resolvedCategoryId
    });

    return NextResponse.json(
      { success: true, data: product },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/products error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
