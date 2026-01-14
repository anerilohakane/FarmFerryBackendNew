import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Customer from "@/models/Customer";
import { authenticate } from "@/middlewares/auth.middleware";

export async function POST(req) {
  try {
    await dbConnect();

    // 🔐 Authenticate user
    const authResult = await authenticate(req);
    if (!authResult.success) {
      console.error("❌ Authentication failed:", authResult.error);
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const user = authResult.user;
    console.log(`✅ [PlaceOrder] User authenticated: ${user._id} (${user.email || user.name})`);

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

    /* ------------------ IDENTIFY CUSTOMER ------------------ */

    // In this system, the authenticated 'user' IS the Customer document (if role is customer).
    let customer = user;

    // 🛠️ Lazy Create Customer if missing/deleted from DB but has valid token
    if (user.isMissing) {
      console.log(`🛠️ [PlaceOrder] Lazy creating customer profile for ID: ${user._id}`);
      try {
        // We create a minimal customer profile. 
        // Note: We don't have phone/email from token usually, so we leave them blank or placeholder.
        customer = await Customer.create({
          _id: user._id,
          firstName: "Recovered",
          lastName: "User",
          role: "customer",
          isPhoneVerified: true
        });
        console.log(`✅ [PlaceOrder] Customer profile created: ${customer._id}`);
      } catch (err) {
        console.error("❌ [PlaceOrder] Failed to lazy create customer:", err);
        // If it failed because it already exists (race condition), try to fetch it
        if (err.code === 11000) {
          customer = await Customer.findById(user._id);
        } else {
          return NextResponse.json(
            { success: false, message: "Failed to initialize customer profile" },
            { status: 500 }
          );
        }
      }
    }

    if (authResult.role !== 'customer') {
      // Optional: Handle case where admin/supplier tries to place order
      // For now, we assume only customers place orders or we log a warning
      console.warn(`⚠️ [PlaceOrder] User role is '${authResult.role}', treating as customer.`);
    }

    console.log(`✅ [PlaceOrder] Using customer profile: ${customer._id}`);

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

    /* ------------------ LOCK PRODUCT PRICES ------------------ */

    const orderItems = [];

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
    }

    /* ------------------ CREATE ORDER ------------------ */

    console.log(`📝 [PlaceOrder] Creating order for customer ${customer._id} with ${orderItems.length} items...`);
    const order = await Order.create({
      customer: customer._id, // ✅ derived securely
      supplier, // Optional now
      items: orderItems,
      deliveryAddress,
      paymentMethod,
      couponCode,
      isExpressDelivery: isExpressDelivery || false,
      status: "pending",
      paymentStatus: "pending"
    });

    console.log(`🎉 [PlaceOrder] Order created successfully: ${order._id}`);

    return NextResponse.json(
      {
        success: true,
        message: "Order placed successfully",
        order
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Order creation error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create order",
        error: error.message
      },
      { status: 500 }
    );
  }
}
