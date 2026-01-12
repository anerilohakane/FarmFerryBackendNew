import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import Product from '@/models/Product';
import Order from '@/models/Order'; // Need orders to determine top selling

export async function GET(req) {
  try {
    await dbConnect();

    // Top selling products (approximation based on Order items if accessible, or just Product sales counter if exists)
    // Product model doesn't seem to have 'sales' counter.
    // We can aggregate Orders to find top products.
    // But Order items schema is needed.
    // Assuming Order.items = [{ product: ObjectId, quantity: Number, ... }]

    const topSellingProducts = await Order.aggregate([
        { $unwind: "$items" },
        { $group: {
            _id: "$items.product",
            totalSold: { $sum: "$items.quantity" },
            revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
        }},
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
        { $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "product"
        }},
        { $unwind: "$product" },
        { $project: {
            product: { name: "$product.name", images: "$product.images" },
            totalSold: 1,
            revenue: 1
        }}
    ]);

    // Top Categories
    const topCategories = await Order.aggregate([
        { $unwind: "$items" },
        { $lookup: {
            from: "products",
            localField: "items.product",
            foreignField: "_id",
            as: "product"
        }},
        { $unwind: "$product" },
        { $group: {
            _id: "$product.categoryId", // Group by category
            totalSold: { $sum: "$items.quantity" }
        }},
        { $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "category"
        }},
        { $unwind: "$category" },
        { $project: {
            category: { name: "$category.name" },
            totalSold: 1
        }}
    ]);

    return NextResponse.json({
      success: true,
      data: {
        topSellingProducts,
        topCategories
      }
    });
  } catch (error) {
    console.error("Analytics Products Error: ", error); // Debug
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
