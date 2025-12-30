import Product from "@/models/Product";
import { authenticateSupplier } from "@/middlewares/auth.middleware";
import connectDB from "@/lib/connectDB";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    await connectDB();
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const supplier = await authenticateSupplier(token);
    
    if (!supplier) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');
    const sort = searchParams.get('sort') || "createdAt";
    const order = searchParams.get('order') || "desc";
    const page = parseInt(searchParams.get('page') || "1");
    const limit = parseInt(searchParams.get('limit') || "10");
    
    const queryOptions = { supplierId: supplier._id };
    
    // Search by name
    if (search) {
      queryOptions.name = { $regex: search, $options: "i" };
    }
    
    // Filter by category
    if (category) {
      queryOptions.categoryId = category;
    }
    
    // Filter by active status
    if (isActive !== null) {
      queryOptions.isActive = isActive === "true";
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Prepare sort options
    const sortOptions = {};
    sortOptions[sort] = order === "asc" ? 1 : -1;
    
    // Get products with pagination
    const products = await Product.find(queryOptions)
      .populate("categoryId", "name")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const totalProducts = await Product.countDocuments(queryOptions);
    
    return NextResponse.json({
      success: true,
      message: "Supplier products fetched successfully",
      data: { 
        products,
        pagination: {
          total: totalProducts,
          page,
          limit,
          pages: Math.ceil(totalProducts / limit)
        }
      }
    });

  } catch (error) {
    console.error("Get products error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}