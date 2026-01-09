import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Customer from "@/models/Customer";
import Notification from "@/models/Notification";
import DeliveryAssociate from "@/models/DeliveryAssociate";
import { verifyJWT } from "@/middlewares/auth.middleware";

export async function POST(req) {
  try {
    await dbConnect();

    // 🔐 JWT user (User collection)
    const user = await verifyJWT(req);

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

    const customer = await Customer.findOne({ user: user._id });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer profile not found" },
        { status: 404 }
      );
    }

    /* ------------------ VALIDATIONS ------------------ */

    if (!supplier) {
      return NextResponse.json(
        { success: false, message: "Supplier is required" },
        { status: 400 }
      );
    }

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

    const order = await Order.create({
      customer: customer._id, // ✅ derived securely
      supplier,
      items: orderItems,
      deliveryAddress,
      paymentMethod,
      couponCode,
      isExpressDelivery: isExpressDelivery || false,
      status: "pending",
      paymentStatus: "pending"
    });

    // 🔔 Notify all active Delivery Associates
    const activeDas = await DeliveryAssociate.find({ isActive: true, isVerified: true });
    
    if (activeDas.length > 0) {
      const notifications = activeDas.map(da => ({
        recipient: da._id,
        recipientType: 'deliveryAssociate',
        title: 'New Order Available',
        message: `New order #${order._id.toString().slice(-6)} is available for delivery.`,
        type: 'order_available',
        referenceId: order._id
      }));
      
      await Notification.insertMany(notifications);
    }

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
