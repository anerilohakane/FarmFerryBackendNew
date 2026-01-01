import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Category from "@/models/Category";

export async function POST(req) {
  try {
    await dbConnect();

    const body = await req.json();
    const {
      name,
      description,
      image,
      parent = null,
      handlingFee = 0,
      isActive = true,
      subcategories = [],
    } = body;

    // Duplicate name check
    const exists = await Category.findOne({ name });
    if (exists) {
      return NextResponse.json(
        { success: false, message: "Category already exists" },
        { status: 400 }
      );
    }

    // Validate parent category
    if (parent) {
      const parentExists = await Category.findById(parent);
      if (!parentExists) {
        return NextResponse.json(
          { success: false, message: "Parent category not found" },
          { status: 404 }
        );
      }
    }

    // Create parent category
    const category = await Category.create({
      name,
      description,
      image,
      parent,
      handlingFee,
      isActive,
    });

    // Create subcategories (optional)
    let createdSubcategories = [];
    if (subcategories.length > 0) {
      createdSubcategories = await Category.insertMany(
        subcategories.map((sub) => ({
          name: sub.name,
          description: sub.description,
          image: sub.image,
          parent: category._id,
          handlingFee: sub.handlingFee || 0,
          isActive: sub.isActive ?? true,
        }))
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Category created successfully",
        category,
        subcategories: createdSubcategories,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CATEGORY CREATE ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}


export async function GET(req) {
  try {
    await dbConnect();
   
    const categories = await Category.find();

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("GET CATEGORIES ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}