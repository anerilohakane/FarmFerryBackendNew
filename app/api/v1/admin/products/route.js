import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import Product from '@/models/Product';
import { handleCors, corsHandler } from '@/utils/corsHandler';

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || "1");
    const limit = parseInt(searchParams.get('limit') || "10");

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const products = await Product.find(query)
      .populate('category')
      .populate('supplier')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    // Assuming JSON body for now. If Form Data, Next.js parsing might need middleware or basic parsing.
    // api.js sends JSON if not formData. But addProduct sends FormData.
    // For FormData in Next.js App Router:
    const formData = await req.formData();
    
    // Extract fields manually
    const name = formData.get('name');
    const description = formData.get('description');
    const price = formData.get('price');
    const category = formData.get('category');
    const stock = formData.get('stock');
    const supplier = formData.get('supplier'); 
    
    // Handle image upload (Cloudinary) logic if needed. 
    // For now, I'll assume we parse basic fields. 
    // If the backend has an upload helper, I should use it. 
    // `models/Product` has `images` array.
    
    // Stub simple creation for now:
    const newProduct = await Product.create({
        name,
        description,
        price,
        category,
        stock,
        supplier, // This needs to be valid Supplier ID
        // images: ... 
    });

    return NextResponse.json({ success: true, data: { product: newProduct } });

  } catch (error) {
     return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}    
