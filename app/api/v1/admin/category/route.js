import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Category from "@/models/Category";
import { authenticate, requireRole } from "@/middlewares/auth.middleware";

export async function GET(request) {
    await dbConnect();

    try {
        const url = new URL(request.url);
        const activeOnly = url.searchParams.get("active") === "true";
        const level = url.searchParams.get("level"); // 'root' for top-level only
        const populate = url.searchParams.get("populate") === "true";

        const filter = {};
        if (activeOnly) {
            filter.isActive = true;
        }

        if (level === "root") {
            filter.parent = null;
        }

        let query = Category.find(filter).sort({ name: 1 });

        if (populate) {
            query = query.populate("subcategories");
        }

        // Also Populate parent info if not just root
        if (level !== "root") {
            query = query.populate("parent", "name slug");
        }

        const categories = await query.lean();

        // If virtuals are needed (like subcategories), we might need to rely on toJSON/toObject or manual population
        // Mongoose .lean() does not include virtuals by default unless using a plugin or handling it manually.
        // However, the schema has { virtuals: true }, so standard .find() (not lean) + .toJSON() would work best 
        // OR we just assume the client will query subcategories by parent ID.
        // For now, let's return standard lean objects.

        return NextResponse.json({
            success: true,
            data: categories,
        });
    } catch (error) {
        console.error("GET /api/v1/category error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch categories" },
            { status: 500 }
        );
    }
}

import cloudinary from "@/lib/cloudinary";

export async function POST(request) {
    await dbConnect();

    // 1. Authenticate & Authorize (Admin only)
    const authCheck = await requireRole(["admin", "superadmin"])(request);
    if (!authCheck.success) {
        return NextResponse.json(
            { success: false, error: authCheck.error },
            { status: authCheck.statusCode }
        );
    }

    try {
        const formData = await request.formData();
        
        const name = formData.get('name');
        const description = formData.get('description');
        const isActive = formData.get('isActive') === 'true';
        const parent = formData.get('parent');
        const imageFile = formData.get('image');

        // 2. Validation
        if (!name) {
            return NextResponse.json(
                { success: false, error: "Category name is required" },
                { status: 400 }
            );
        }

        // Check for duplicate name
        const existing = await Category.findOne({
            name: { $regex: new RegExp(`^${name}$`, "i") }
        });

        if (existing) {
            return NextResponse.json(
                { success: false, error: "Category with this name already exists" },
                { status: 409 }
            );
        }

        // Validate Parent
        if (parent) {
            const parentCat = await Category.findById(parent);
            if (!parentCat) {
                return NextResponse.json(
                    { success: false, error: "Parent category not found" },
                    { status: 400 }
                );
            }
        }

        // Image Upload
        let imageData = {};
        if (imageFile && typeof imageFile !== 'string') {
             const arrayBuffer = await imageFile.arrayBuffer();
             const buffer = Buffer.from(arrayBuffer);
             const fileBase64 = `data:${imageFile.type};base64,${buffer.toString('base64')}`;

             const uploadResponse = await new Promise((resolve, reject) => {
                 cloudinary.uploader.upload(fileBase64, {
                     folder: "categories",
                     resource_type: "image"
                 }, (error, result) => {
                     if (error) reject(error);
                     else resolve(result);
                 });
             });
             imageData = {
                 url: uploadResponse.secure_url,
                 publicId: uploadResponse.public_id
             };
        }

        // 3. Create
        const category = await Category.create({
            name,
            description,
            isActive,
            parent: parent || null,
            image: imageData,
            createdBy: authCheck.user._id
        });

        return NextResponse.json(
            { success: true, data: category },
            { status: 201 }
        );

    } catch (error) {
        console.error("POST /api/v1/category error:", error);
        // Handle Mongoose duplicate key error specifically if needed
        if (error.code === 11000) {
            return NextResponse.json(
                { success: false, error: "Category already exists" },
                { status: 409 }
            );
        }
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}