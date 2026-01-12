import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import Product from '@/models/Product';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const product = await Product.findById(params.id).populate('category').populate('supplier');
    if (!product) return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: { product } });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    await dbConnect();
    const body = await req.json().catch(() => null); 
    // If formData, use req.formData(). api.js 'updateProduct' uses FormData.
    let updateData = {};
    
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        // Extract all entries to an object
        for (const [key, value] of formData.entries()) {
            updateData[key] = value;
        }
    } else if (body) {
        updateData = body;
    }

    const product = await Product.findByIdAndUpdate(params.id, updateData, { new: true });
    return NextResponse.json({ success: true, data: { product } });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
    try {
        await dbConnect();
        await Product.findByIdAndDelete(params.id);
        return NextResponse.json({ success: true, message: 'Product deleted' });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
