import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Cart from "@/models/Cart";
import Product from "@/models/Product";
import { authenticate } from "@/middlewares/auth.middleware";
const fs = require('fs');

// PUT /api/v1/cart/items/[itemId]
export async function PUT(request, { params }) {
    await dbConnect();
    try {
        const authResult = await authenticate(request);
        if (!authResult.success) {
            return NextResponse.json(
                { success: false, error: authResult.error },
                { status: authResult.statusCode }
            );
        }

        const userId = authResult.user._id;
        const { itemId } = params;

        let body;
        try {
            body = await request.json();
        } catch (e) {
            return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
        }

        const { quantity } = body;

        fs.appendFileSync('cart_debug.log', `[${new Date().toISOString()}] PUT /cart/items/${itemId} | Qty: ${quantity} | User: ${userId}\n`);

        // Validate quantity
        if (quantity === undefined || quantity < 0) {
            return NextResponse.json({ success: false, error: "Invalid quantity" }, { status: 400 });
        }

        const cart = await Cart.findOne({ customer: userId });
        if (!cart) {
            fs.appendFileSync('cart_debug.log', `PUT Error: Cart not found for user ${userId}\n`);
            return NextResponse.json({ success: false, error: "Cart not found" }, { status: 404 });
        }

        // Find the item in the cart array
        // Check by subdocument ID first, then fall back to productId if needed
        let itemIndex = cart.items.findIndex(i => String(i._id) === String(itemId));

        if (itemIndex === -1) {
            // Try finding by productId as fallback
            itemIndex = cart.items.findIndex(i => String(i.product) === String(itemId));
        }

        if (itemIndex === -1) {
            fs.appendFileSync('cart_debug.log', `PUT Error: Item ${itemId} not found in cart for user ${userId}. Items: ${JSON.stringify(cart.items.map(i => ({ _id: i._id, product: i.product })))}\n`);
            return NextResponse.json({ success: false, error: "Item not found in cart" }, { status: 404 });
        }

        // Get the product to validate stock
        const productId = cart.items[itemIndex].product;
        const product = await Product.findById(productId);

        if (!product) {
            return NextResponse.json({ success: false, error: "Product no longer available" }, { status: 404 });
        }

        // Check stock
        if (product.stockQuantity != null && quantity > product.stockQuantity) {
            return NextResponse.json({
                success: false,
                error: `Only ${product.stockQuantity} items available in stock`
            }, { status: 400 });
        }

        // Update quantity
        if (quantity === 0) {
            // Remove item if quantity is 0
            cart.items.splice(itemIndex, 1);
        } else {
            cart.items[itemIndex].quantity = quantity;

            const price = product.discountedPrice || product.price;
            cart.items[itemIndex].totalPrice = price * quantity;

            // Update name/image/etc if changed? Usually not needed for simple qty update, 
            // but keeping snapshot consistent is good.
            // cart.items[itemIndex].price = product.price; ...
        }

        // Recalculate subtotal
        cart.subtotal = cart.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
        cart.updatedAt = new Date();

        await cart.save();

        // Populate for response
        await cart.populate({
            path: "items.product",
            model: Product,
        });

        // Format response (consistent with GET /cart)
        const formattedItems = cart.items
            .filter(item => item.product)
            .map((item) => {
                const p = item.product;
                return {
                    _id: item._id,
                    productId: p?._id?.toString(),
                    quantity: item.quantity,
                    product: {
                        _id: p?._id?.toString(),
                        name: p?.name,
                        price: p?.price,
                        unit: p?.unit,
                        images: p?.images || [],
                        image: p?.images?.[0]?.url || "/images/placeholder-product.png",
                        stockQuantity: p?.stockQuantity,
                        gst: p?.gst
                    },
                    price: p?.price,
                    discountedPrice: p?.discountedPrice
                };
            });

        return NextResponse.json({
            success: true,
            data: {
                userId,
                items: formattedItems,
                subtotal: cart.subtotal,
            },
        });

    } catch (err) {
        console.error("PUT /api/cart/items error", err);
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}

// DELETE /api/v1/cart/items/[itemId]
export async function DELETE(request, { params }) {
    await dbConnect();
    try {
        const authResult = await authenticate(request);
        if (!authResult.success) {
            return NextResponse.json(
                { success: false, error: authResult.error },
                { status: authResult.statusCode }
            );
        }

        const userId = authResult.user._id;
        const { itemId } = params;

        fs.appendFileSync('cart_debug.log', `[${new Date().toISOString()}] DELETE /cart/items/${itemId} | User: ${userId}\n`);

        const cart = await Cart.findOne({ customer: userId });
        if (!cart) {
            return NextResponse.json({ success: true, data: { userId, items: [], subtotal: 0 } });
        }

        // Filter out the item
        const originalLength = cart.items.length;

        // Log items before deletion for debugging
        const itemIds = cart.items.map(i => ({ _id: String(i._id), product: String(i.product) }));
        fs.appendFileSync('cart_debug.log', `Current Cart Items: ${JSON.stringify(itemIds)}\n`);

        cart.items = cart.items.filter(item =>
            String(item._id) !== String(itemId) && String(item.product) !== String(itemId)
        );

        if (cart.items.length === originalLength) {
            fs.appendFileSync('cart_debug.log', `Item ${itemId} not found in cart. No changes made.\n`);
            return NextResponse.json({ success: false, error: "Item not found in cart" }, { status: 404 });
        } else {
            fs.appendFileSync('cart_debug.log', `Item ${itemId} removed. New length: ${cart.items.length}\n`);
        }

        // Recalculate subtotal
        cart.subtotal = cart.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
        cart.updatedAt = new Date();

        await cart.save();

        // Populate and Format
        await cart.populate({
            path: "items.product",
            model: Product,
        });

        const formattedItems = cart.items
            .filter(item => item.product)
            .map((item) => {
                const p = item.product;
                return {
                    _id: item._id,
                    productId: p?._id?.toString(),
                    quantity: item.quantity,
                    product: {
                        _id: p?._id?.toString(),
                        name: p?.name,
                        price: p?.price,
                        unit: p?.unit,
                        images: p?.images || [],
                        image: p?.images?.[0]?.url || "/images/placeholder-product.png",
                        stockQuantity: p?.stockQuantity,
                        gst: p?.gst
                    },
                    price: p?.price,
                    discountedPrice: p?.discountedPrice
                };
            });

        return NextResponse.json({
            success: true,
            data: {
                userId,
                items: formattedItems,
                subtotal: cart.subtotal,
            },
        });

    } catch (err) {
        console.error("DELETE /api/cart/items error", err);
        fs.appendFileSync('cart_debug.log', `DELETE ERROR: ${err.message}\n`);
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}
