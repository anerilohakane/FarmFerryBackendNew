import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Category from "@/models/Category";
import Product from "@/models/Product";
import { authenticate, requireRole } from "@/middlewares/auth.middleware";

// Helper to check for circular dependency
async function isCircularQuery(targetId, newParentId) {
    if (targetId === newParentId) return true;

    let currentParentId = newParentId;
    while (currentParentId) {
        const parent = await Category.findById(currentParentId);
        if (!parent || !parent.parent) break;
        if (parent.parent.toString() === targetId) return true;
        currentParentId = parent.parent.toString();
    }
    return false;
}

export async function GET(request, { params }) {
    await dbConnect();
    try {
        const category = await Category.findById(params.id).populate("parent");

        if (!category) {
            return NextResponse.json(
                { success: false, error: "Category not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: category });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: "Invalid ID format" },
            { status: 400 }
        );
    }
}

export async function PUT(request, { params }) {
    await dbConnect();

    // 1. Auth check
    const authCheck = await requireRole(["admin", "superadmin"])(request);
    if (!authCheck.success) {
        return NextResponse.json(
            { success: false, error: authCheck.error },
            { status: authCheck.statusCode }
        );
    }

    try {
        const body = await request.json();
        const { id } = params;

        const category = await Category.findById(id);
        if (!category) {
            return NextResponse.json(
                { success: false, error: "Category not found" },
                { status: 404 }
            );
        }

        // 2. updates
        if (body.name) category.name = body.name;
        if (body.description !== undefined) category.description = body.description;
        if (body.image) category.image = body.image;
        if (body.handlingFee !== undefined) category.handlingFee = body.handlingFee;
        if (body.isActive !== undefined) category.isActive = body.isActive;

        // 3. Parent update with circular check
        if (body.parent !== undefined) {
            // If setting to null (root), it's always safe
            if (body.parent === null) {
                category.parent = null;
            } else {
                // Validation
                if (body.parent === id) {
                    return NextResponse.json(
                        { success: false, error: "Category cannot be its own parent" },
                        { status: 400 }
                    );
                }

                // Circular Check
                const isCircular = await isCircularQuery(id, body.parent);
                if (isCircular) {
                    return NextResponse.json(
                        { success: false, error: "Circular dependency detected" },
                        { status: 400 }
                    );
                }

                category.parent = body.parent;
            }
        }

        await category.save();

        return NextResponse.json({ success: true, data: category });

    } catch (error) {
        console.error("PUT category error:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(request, { params }) {
    await dbConnect();

    const authCheck = await requireRole(["admin", "superadmin"])(request);
    if (!authCheck.success) {
        return NextResponse.json(
            { success: false, error: authCheck.error },
            { status: authCheck.statusCode }
        );
    }

    try {
        const { id } = params;

        // 1. Check if category exists
        const category = await Category.findById(id);
        if (!category) {
            return NextResponse.json(
                { success: false, error: "Category not found" },
                { status: 404 }
            );
        }

        // 2. Check for dependencies (Subcategories)
        const subcats = await Category.countDocuments({ parent: id });
        if (subcats > 0) {
            return NextResponse.json(
                { success: false, error: `Cannot delete: This category has ${subcats} subcategories.` },
                { status: 400 }
            );
        }

        // 3. Check for dependencies (Products)
        const products = await Product.countDocuments({ categoryId: id });
        if (products > 0) {
            return NextResponse.json(
                { success: false, error: `Cannot delete: This category has ${products} products associated with it.` },
                { status: 400 }
            );
        }

        // 4. Delete
        await Category.findByIdAndDelete(id);

        return NextResponse.json({
            success: true,
            message: "Category deleted successfully"
        });

    } catch (error) {
        console.error("DELETE category error:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
