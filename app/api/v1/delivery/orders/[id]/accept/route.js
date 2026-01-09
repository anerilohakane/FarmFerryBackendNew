import { NextResponse } from "next/server";
import { authenticateDeliveryAssociate } from "@/middlewares/auth.middleware";
import Order from "@/models/Order";
import dbConnect from "@/lib/connectDB";

export async function PATCH(req, props) {
  const params = await props.params;
  try {
    await dbConnect();
    
    const authResult = await authenticateDeliveryAssociate(req);
    if (!authResult.success) {
        return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.statusCode });
    }

    const orderId = params.id;
    const daId = authResult.user._id;

    // Atomic Update: Find order that is UNASSIGNED and update it locally
    // This prevents race conditions where two DAs try to accept at the same time
    const updatedOrder = await Order.findOneAndUpdate(
        {
            _id: orderId,
            status: { $in: ["pending", "packaging"] },
            $or: [
                { "deliveryAssociate": { $exists: false } },
                { "deliveryAssociate.associate": null }
            ]
        },
        {
            $set: {
                "deliveryAssociate.associate": daId,
                "deliveryAssociate.status": "assigned",
                "deliveryAssociate.assignedAt": new Date(),
                "deliveryAssociate.name": authResult.user.name,
                status: "processing" // User requested 'processing'
            },
            $push: {
                statusHistory: {
                    status: "processing",
                    updatedBy: daId,
                    updatedByModel: "DeliveryAssociate",
                    note: "Delivery Associate accepted the order"
                }
            }
        },
        { new: true }
    );

    if (!updatedOrder) {
        return NextResponse.json({ 
            success: false, 
            message: "Order already assigned or not found." 
        }, { status: 409 }); // Conflict
    }

    return NextResponse.json({
        success: true,
        message: "Order accepted successfully",
        data: updatedOrder
    });

  } catch (error) {
    console.error("Order Acceptance Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
