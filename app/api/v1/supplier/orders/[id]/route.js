import Order from "@/models/Order";
import { authenticateSupplier } from "@/middlewares/auth.middleware";
import connectDB from "@/lib/connectDB";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const supplier = await authenticateSupplier(token);
    
    if (!supplier) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    const order = await Order.findOne({ _id: id, supplier: supplier._id })
      .populate("customer", "firstName lastName email")
      .populate("items.product", "name images");
    
    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Order fetched successfully",
      data: { order }
    });

  } catch (error) {
    console.error("Get order error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const supplier = await authenticateSupplier(token);
    
    if (!supplier) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { status, note } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, message: "Status is required" },
        { status: 400 }
      );
    }

    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    // Ensure the supplier owns this order
    if (order.supplier.toString() !== supplier._id.toString()) {
      return NextResponse.json(
        { success: false, message: "You don't have permission to update this order" },
        { status: 403 }
      );
    }

    // Update the main order status
    order.status = status;

    // Add a note to the status history
    const historyEntry = {
      status: status,
      updatedAt: new Date(),
      updatedBy: supplier._id,
      updatedByModel: "Supplier",
    };

    if (note) {
      historyEntry.note = note;
    }

    // Avoid duplicating the last status history entry
    const lastStatus = order.statusHistory.length > 0 ? order.statusHistory[order.statusHistory.length - 1] : null;
    if (!lastStatus || lastStatus.status !== status) {
      order.statusHistory.push(historyEntry);
    }

    await order.save();

    return NextResponse.json({
      success: true,
      message: "Order status updated successfully",
      data: { order }
    });

  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}