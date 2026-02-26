import { NextResponse } from "next/server";

export async function OPTIONS(req) {
  const { corsHandler } = await import("@/utils/corsHandler");
  return new Response(null, {
    status: 204,
    headers: corsHandler(req),
  });
}

export async function GET(request) {
  try {
    const dbConnect = (await import("@/lib/connectDB")).default;
    const Product = (await import("@/models/Product")).default;
    const Category = (await import("@/models/Category")).default;
    const Supplier = (await import("@/models/Supplier")).default;

    await dbConnect();

    const url = new URL(request.url, "http://localhost");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const page = parseInt(url.searchParams.get("page") || "1");
    const q = url.searchParams.get("q") || url.searchParams.get("search");
    const categoryId = url.searchParams.get("categoryId");
    const supplierId = url.searchParams.get("supplierId");

    const filter = {};
    const orConditions = [];

    // --- Helper: Levenshtein Distance for Fuzzy Search ---
    const getLevenshteinDistance = (a, b) => {
      if (a.length === 0) return b.length;
      if (b.length === 0) return a.length;
      const matrix = [];
      for (let i = 0; i <= b.length; i++) matrix[i] = [i];
      for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b.charAt(i - 1) === a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      return matrix[b.length][a.length];
    };

    // Search Logic
    let isFuzzySearch = false;
    let fuzzyIds = [];

    if (q) {
      const searchRegex = { $regex: q.trim(), $options: "i" };
      orConditions.push({ name: searchRegex });
      orConditions.push({ description: searchRegex });

      // Category Search (Regex)
      try {
        const matchingCats = await Category.find({ name: searchRegex }).select('_id').lean();
        if (matchingCats.length > 0) {
          const catIds = matchingCats.map(c => c._id);
          const childCats = await Category.find({ parent: { $in: catIds } }).select('_id').lean();
          const allCatIds = [...catIds, ...childCats.map(c => c._id)];
          orConditions.push({ categoryId: { $in: allCatIds } });
        }
      } catch (err) {
        console.error("Category Search Error:", err);
      }

      if (orConditions.length > 0) {
        filter.$or = orConditions;
      }
    }

    // Category Filter (Strict)
    if (categoryId) {
      const isId = (id) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
      if (isId(categoryId)) {
        filter.categoryId = categoryId;
      } else {
        const cat = await Category.findOne({
          $or: [{ slug: categoryId }, { name: { $regex: `^${categoryId}$`, $options: "i" } }]
        }).lean();
        if (cat) filter.categoryId = cat._id;
        else return NextResponse.json({ success: true, data: { items: [], pagination: { total: 0 } } });
      }
    }

    if (supplierId) filter.supplierId = supplierId;

    // --- EXECUTE SEARCH vs BROWSE ---

    let items = [];
    let total = 0;

    if (q) {
      // --- SEARCH MODE: Fetch All Matches + Expand to Siblings ---

      // 1. Primary Search (Strict)
      let primaryMatches = await Product.find(filter)
        .populate('categoryId', 'name slug image parent')
        .populate('supplierId', 'businessName name')
        .sort({ createdAt: -1 })
        .lean();

      // 2. Fuzzy Fallback (if strict failed)
      if (primaryMatches.length === 0) {
        console.log(`[Search] Strict search 0 results. Trying Fuzzy...`);
        try {
          const allProducts = await Product.find({})
            .select('_id name description categoryId source')
            .populate('categoryId', 'name slug image parent')
            .lean();

          const queryLower = q.trim().toLowerCase();
          const fuzzyIds = allProducts.filter(p => {
            const name = p.name ? p.name.toLowerCase() : "";
            // Distance Logic
            const maxDist = name.length < 5 ? 1 : name.length < 10 ? 2 : 3;
            if (name.includes(queryLower)) return true;
            if (getLevenshteinDistance(queryLower, name) <= maxDist) return true;
            return name.split(' ').some(w => getLevenshteinDistance(queryLower, w) <= (w.length < 5 ? 1 : 1));
          }).map(p => p._id);

          if (fuzzyIds.length > 0) {
            primaryMatches = await Product.find({ _id: { $in: fuzzyIds } })
              .populate('categoryId', 'name slug image parent')
              .populate('supplierId', 'businessName name')
              .lean();
          }
        } catch (err) { console.error(err); }
      }

      // 3. Expansion: Fetch Siblings (Same Category)
      if (primaryMatches.length > 0) {
        const matchIds = new Set(primaryMatches.map(p => p._id.toString()));
        const categoryIds = new Set();
        const parentCategoryIds = new Set();

        primaryMatches.forEach(p => {
          if (p.categoryId?._id) categoryIds.add(p.categoryId._id.toString());
          if (p.categoryId?.parent) parentCategoryIds.add(p.categoryId.parent.toString());
        });

        // A. Same Subcategory Siblings
        const siblingFilter = {
          categoryId: { $in: Array.from(categoryIds) },
          _id: { $nin: Array.from(matchIds) }
        };

        // Limit siblings to prevent massive payloads (e.g. 50)
        let siblings = await Product.find(siblingFilter)
          .limit(50)
          .populate('categoryId', 'name slug image parent')
          .populate('supplierId', 'businessName name')
          .lean();

        // B. Same Parent Category Fallback (if siblings are few)
        if (siblings.length < 5 && parentCategoryIds.size > 0) {
          const cousinCategories = await Category.find({ parent: { $in: Array.from(parentCategoryIds) } }).select('_id').lean();
          const cousinCatIds = cousinCategories.map(c => c._id);

          const cousinFilter = {
            categoryId: { $in: cousinCatIds },
            _id: { $nin: [...Array.from(matchIds), ...siblings.map(s => s._id)] }
          };

          const cousins = await Product.find(cousinFilter)
            .limit(20)
            .populate('categoryId', 'name slug image parent')
            .populate('supplierId', 'businessName name')
            .lean();

          siblings = [...siblings, ...cousins];
        }

        items = [...primaryMatches, ...siblings];
      } else {
        items = [];
      }

      total = items.length;

      // Memory Pagination
      const startIndex = (page - 1) * limit;
      items = items.slice(startIndex, startIndex + limit);

    } else {
      // --- BROWSE MODE (Standard DB Pagination) ---
      const skip = (page - 1) * limit;

      const [count, docs] = await Promise.all([
        Product.countDocuments(filter),
        Product.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('categoryId', 'name slug image parent')
          .populate('supplierId', 'businessName name')
          .lean()
      ]);

      items = docs;
      total = count;
    }

    return NextResponse.json({
      success: true,
      data: {
        items,
        products: items, // ensuring compatibility
        pagination: { total, page, limit, pages: Math.ceil(total / limit) }
      }
    });

  } catch (e) {
    console.error("GET Error:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/*
export async function POST(request) {
  try {
    const dbConnect = (await import("@/lib/connectDB")).default;
    const Category = (await import("@/models/Category")).default;
    const Product = (await import("@/models/Product")).default;
    const Supplier = (await import("@/models/Supplier")).default;
    const { authenticate } = await import("@/middlewares/auth.middleware");
    const cloudinary = (await import("@/lib/cloudinary")).default;

    await dbConnect();

    const authResult = await authenticate(request);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.statusCode });
    }
    const user = authResult.user;
    const role = authResult.role;

    if (!['admin', 'superadmin', 'supplier'].includes(role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    let body = {};
    let imageFiles = [];
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      body = {
        name: formData.get('name'),
        description: formData.get('description'),
        price: parseFloat(formData.get('price')),
        stockQuantity: parseInt(formData.get('stockQuantity')),
        categoryId: formData.get('categoryId'),
        status: formData.get('status'),
        sku: formData.get('sku'),
        supplierId: formData.get('supplierId')
      };
      if (formData.get('isActive')) body.isActive = formData.get('isActive') === 'true';
      else if (body.status === 'Active') body.isActive = true;
      imageFiles = formData.getAll('images');
    } else {
      body = await request.json();
    }

    if (role === 'supplier') {
      body.supplierId = user._id;
    } else {
      if (!body.supplierId) {
        const defaultSupplier = await Supplier.findOne();
        if (defaultSupplier) body.supplierId = defaultSupplier._id;
        else return NextResponse.json({ success: false, error: "No supplier found" }, { status: 400 });
      }
    }

    const uploadedImages = [];
    if (Array.isArray(body.images) && body.images.length > 0 && typeof body.images[0] === 'object') {
      uploadedImages.push(...body.images);
    }
    if (imageFiles && imageFiles.length > 0) {
      for (const file of imageFiles) {
        if (file && typeof file !== 'string') {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

          const uploadRes = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload(base64, {
              folder: "products",
              resource_type: "image"
            }, (error, result) => {
              if (error) reject(error); else resolve(result);
            });
          });
          uploadedImages.push({
            url: uploadRes.secure_url,
            publicId: uploadRes.public_id,
            isMain: uploadedImages.length === 0
          });
        }
      }
      body.images = uploadedImages;
    }

    if (!body.name || body.price == null || body.stockQuantity == null || !body.images || body.images.length === 0) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }

    let resolvedCategoryId = null;
    const isId = (id) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);

    if (body.categoryId) {
      if (isId(body.categoryId)) {
        const cat = await Category.findById(body.categoryId);
        if (!cat) return NextResponse.json({ success: false, error: "Invalid categoryId" }, { status: 400 });
        resolvedCategoryId = cat._id.toString();
      } else {
        const cat = await Category.findOne({
          $or: [{ slug: body.categoryId }, { name: new RegExp(`^${body.categoryId}$`, "i") }]
        });
        if (!cat) return NextResponse.json({ success: false, error: "Category not found" }, { status: 400 });
        resolvedCategoryId = cat._id.toString();
      }
    } else {
      return NextResponse.json({ success: false, error: "Category required" }, { status: 400 });
    }

    if (body.sku) {
      const conflict = await Product.findOne({ sku: body.sku });
      if (conflict) return NextResponse.json({ success: false, error: "SKU conflict" }, { status: 409 });
    }

    const product = await Product.create({
      ...body,
      categoryId: resolvedCategoryId,
      supplierId: body.supplierId,
      images: uploadedImages
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
*/
