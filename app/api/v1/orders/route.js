import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Customer from "@/models/Customer";
import { authenticate } from "@/middlewares/auth.middleware";
import Admin from "@/models/Admin";
import Notification from "@/models/Notification";

export async function POST(req) {
  try {
    await dbConnect();

    // 🔐 Authenticate
    const authResult = await authenticate(req);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error || "Unauthorized" },
        { status: authResult.statusCode || 401 }
      );
    }
    const { user } = authResult;

    const body = await req.json();
    const {
      supplier,
      items,
      deliveryAddress,
      paymentMethod,
      couponCode,
      isExpressDelivery
    } = body;

    /* ------------------ FIND CUSTOMER FROM USER ------------------ */

    let customer;

    // If the authenticated user is already a customer (standard flow)
    if (user.role === 'customer' || !user.role) {
      customer = user;
    } else {
      customer = user;
    }

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer profile not found" },
        { status: 404 }
      );
    }

    /* ------------------ VALIDATIONS ------------------ */

    if (!items || !items.length) {
      return NextResponse.json(
        { success: false, message: "Order items are required" },
        { status: 400 }
      );
    }

    if (!deliveryAddress) {
      return NextResponse.json(
        { success: false, message: "Delivery address required" },
        { status: 400 }
      );
    }

    if (!paymentMethod) {
      return NextResponse.json(
        { success: false, message: "Payment method required" },
        { status: 400 }
      );
    }

    /* ------------------ LOCK PRODUCT PRICES AND DEDUCT STOCK ------------------ */

    const orderItems = [];
    const notificationPromises = [];

    // Fetch an admin for notifications
    const adminRecipient = await Admin.findOne().select('_id');

    for (const item of items) {
      const product = await Product.findById(item.product);

      if (!product) {
        console.error(`❌ [PlaceOrder] Product not found: ${item.product}`);
        return NextResponse.json(
          { success: false, message: "Product not found" },
          { status: 404 }
        );
      }

      const discountedPrice =
        product.discountedPrice ?? product.price;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
        discountedPrice,
        variation: item.variation || undefined
      });

      // Deduct stock
      if (product.stockQuantity >= item.quantity) {
        product.stockQuantity -= item.quantity;
        product.totalSold = (product.totalSold || 0) + item.quantity;
        await product.save();

        // Check for Low Stock / Out of Stock
        if (adminRecipient) {
          if (product.stockQuantity === 0) {
            notificationPromises.push(Notification.create({
              recipient: adminRecipient._id,
              recipientType: 'admin',
              title: 'Product Out of Stock',
              message: `Product "${product.name}" is now out of stock!`,
              type: 'out_of_stock',
              referenceId: product._id
            }));
          } else if (product.stockQuantity <= 10) {
            notificationPromises.push(Notification.create({
              recipient: adminRecipient._id,
              recipientType: 'admin',
              title: 'Low Stock Alert',
              message: `Product "${product.name}" is running low (${product.stockQuantity} remaining).`,
              type: 'low_stock',
              referenceId: product._id
            }));
          }
        }
      } else {
        return NextResponse.json(
          { success: false, message: `Insufficient stock for ${product.name}` },
          { status: 400 }
        );
      }
    }

    // Execute notification creation
    await Promise.all(notificationPromises);

    /* ------------------ CREATE ORDER ------------------ */

    console.log(`📝 [PlaceOrder] Creating order for customer ${customer._id} with ${orderItems.length} items...`);
    const orderData = {
      customer: customer._id,
      supplier,
      items: orderItems,
      deliveryAddress,
      paymentMethod,
      couponCode,
      isExpressDelivery: isExpressDelivery || false,
      status: "pending",
      paymentStatus: "pending"
    };

    console.log("📦 [PlaceOrder] Order Payload:", JSON.stringify(orderData, null, 2));

    const order = await Order.create(orderData);

    console.log(`✅ [PlaceOrder] Order created successfully: ${order._id}`);

    // Safe serialization for response
    const orderObj = order.toObject ? order.toObject() : order;

    return NextResponse.json(
      {
        success: true,
        message: "Order placed successfully",
        order: orderObj
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Order creation error (safe log):", error.message);

    // Log validation errors specifically but safely
    let errorDetails = null;
    if (error.name === 'ValidationError') {
      try {
        // Create a safe, simple object from validation errors
        errorDetails = {};
        for (const key in error.errors) {
          errorDetails[key] = error.errors[key].message;
        }
        console.error("❌ Validation Detail:", JSON.stringify(errorDetails));
      } catch (e) {
        console.error("❌ Could not log validation details");
      }
    }

    // Ensure we don't pass the full error object if it's complex
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create order",
        error: error.message || "Unknown error",
        details: errorDetails
      },
      { status: 500 }
    );
  }
}
