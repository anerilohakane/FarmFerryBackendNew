import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Product from "@/models/Product";
import Category from "@/models/Category";
import { authenticateSupplier } from "@/middlewares/auth.middleware";
import * as XLSX from "xlsx";

export async function POST(request) {
  try {
    await dbConnect();

    /* ------------------ AUTH ------------------ */
    const authResult = await authenticateSupplier(request);

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const supplierUser = authResult.user;

    /* ------------------ FILE UPLOAD ------------------ */
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }

    // Convert to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    /* ------------------ PARSE EXCEL ------------------ */
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Excel file is empty" },
        { status: 400 }
      );
    }

    /* ------------------ PROCESS ROWS ------------------ */
    const results = {
      total: rows.length,
      success: 0,
      failed: 0,
      errors: []
    };

    // Pre-fetch categories for faster lookup
    const categories = await Category.find({}).lean();
    const categoryMap = new Map();
    categories.forEach(c => {
      categoryMap.set(c.name.toLowerCase().trim(), c._id);
    });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-header, 0-index

      try {
        // Validate required fields
        if (!row.Name || !row.Price || !row.Category) {
          throw new Error("Missing Name, Price, or Category");
        }

        const categoryId = categoryMap.get(String(row.Category).toLowerCase().trim());
        if (!categoryId) {
          throw new Error(`Category "${row.Category}" not found`);
        }

        // Image handling (assume URL or placeholder)
        const images = [];
        if (row.ImageURL) {
          images.push({ 
            url: row.ImageURL, 
            publicId: "external_url_" + Date.now(),
            isMain: true 
          });
        } else {
          // Placeholder if no image provided? Or fail?
          // Let's require image for now or use a default one
          images.push({ 
            url: "https://via.placeholder.com/300", 
            publicId: "placeholder", 
            isMain: true 
          });
        }

        const productData = {
          name: row.Name,
          description: row.Description || "",
          price: Number(row.Price),
          discountedPrice: row.DiscountedPrice ? Number(row.DiscountedPrice) : undefined,
          stockQuantity: Number(row.Stock) || 0,
          unit: row.Unit || "kg",
          images: images,
          categoryId: categoryId,
          supplierId: supplierUser._id,
          sku: row.SKU || undefined, // Will auto-generate if missing
          isActive: row.Active !== undefined ? (String(row.Active).toLowerCase() === 'true') : true
        };

        // Create product
        await Product.create(productData);
        results.success++;
        
      } catch (err) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          name: row.Name || "Unknown",
          error: err.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.total} rows: ${results.success} added, ${results.failed} failed`,
      data: results
    });

  } catch (error) {
    console.error("Bulk Upload Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error: " + error.message },
      { status: 500 }
    );
  }
}
