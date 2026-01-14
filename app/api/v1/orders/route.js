import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Customer from "@/models/Customer";
import Notification from "@/models/Notification";
import DeliveryAssociate from "@/models/DeliveryAssociate";
import Admin from "@/models/Admin";
import { corsHandler } from "@/utils/corsHandler";
import { authenticate } from "@/middlewares/auth.middleware";

export async function OPTIONS(req) {
  return new Response(null, {
    status: 204,
    headers: corsHandler(req),
  });
}

// GET: Fetch all orders (Admin/DA)
export async function GET(req) {
  try {
    await dbConnect();
    
    // Auth check
    const authResult = await authenticate(req);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.statusCode });
    }
    const user = authResult.user; 
    // In a real app, you might restrict this to admin only or filter for DA
    // For now, assuming if they have a valid token they can list orders
    // functionality is primarily for Admin Dashboard

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit')) || 10;
    const page = parseInt(searchParams.get('page')) || 1;
    const sortField = searchParams.get('sort') || 'createdAt';
    const sortOrder = searchParams.get('order') === 'desc' ? -1 : 1;
    const status = searchParams.get('status');

    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
      .populate('customer', 'firstName lastName email phone items') // specific fields
      .populate('items.product', 'name price images')
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: {
        orders: orders.map(order => ({
            ...order.toObject(),
            orderId: order._id
        })),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error("❌ Fetch orders error:", error);
     return NextResponse.json(
      { success: false, message: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}




export async function POST(req) {
  try {
    await dbConnect();

    // 🔐 JWT user (User collection)
    const authResult = await authenticate(req);
    if (!authResult.success) {
        return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.statusCode });
    }
    const user = authResult.user;

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

    console.log("Order POST Debug: Auth User ID:", user._id);
    // In auth middleware for Customer, user IS the customer document usually?
    // Let's check if we need to query by user: user._id or just use user._id
    
    // Attempt 1: As per original code
    let customer = await Customer.findOne({ user: user._id });
    
    // Attempt 2: If auth middleware returns the customer doc itself, then user._id IS the customer _id
    if (!customer) {
        console.log("Debug: Customer not found by { user: user._id }. Trying findById(user._id)...");
        customer = await Customer.findById(user._id);
    }

    if (!customer) {
      console.log("Debug: Customer still not found.");
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

    /* ------------------ LOCK PRODUCT PRICES AND DEDUCT STOCK ------------------ */

    const orderItems = [];
    const notificationPromises = [];
    
    // Fetch an admin for notifications
    const adminRecipient = await Admin.findOne().select('_id'); 

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
      
      // Deduct stock
      if (product.quantity >= item.quantity) {
          product.quantity -= item.quantity;
          product.totalSold = (product.totalSold || 0) + item.quantity;
          await product.save();
          
          // Check for Low Stock / Out of Stock
          if (adminRecipient) {
              if (product.quantity === 0) {
                  notificationPromises.push(Notification.create({
                      recipient: adminRecipient._id,
                      recipientType: 'admin',
                      title: 'Product Out of Stock',
                      message: `Product "${product.name}" is now out of stock!`,
                      type: 'out_of_stock',
                      referenceId: product._id
                  }));
              } else if (product.quantity <= 10) {
                  notificationPromises.push(Notification.create({
                      recipient: adminRecipient._id,
                      recipientType: 'admin',
                      title: 'Low Stock Alert',
                      message: `Product "${product.name}" is running low (${product.quantity} remaining).`,
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
    
    // 🔔 Notify Admin about New Order
    if (adminRecipient) {
        await Notification.create({
            recipient: adminRecipient._id,
            recipientType: 'admin',
            title: 'New Order Placed',
            message: `New order #${order._id.toString().slice(-6)} placed by ${customer.firstName} ${customer.lastName}.`,
            type: 'new_order',
            referenceId: order._id
        });
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
