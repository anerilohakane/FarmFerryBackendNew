
import { NextResponse } from "next/server";
import { authenticateDeliveryAssociate } from "@/middlewares/auth.middleware";
import DeliveryAssociate from "@/models/DeliveryAssociate";
import dbConnect from "@/lib/connectDB";

// Toggle Online/Offline Status
export async function PATCH(req) {
  try {
    await dbConnect();
    
    const authResult = await authenticateDeliveryAssociate(req);
    if (!authResult.success) {
        return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.statusCode });
    }

    const { isOnline } = await req.json();

    const updatedDA = await DeliveryAssociate.findByIdAndUpdate(
        authResult.user._id,
        { isOnline },
        { new: true }
    ).select("isOnline name");

    return NextResponse.json({
        success: true,
        message: `Status updated to ${isOnline ? 'Online' : 'Offline'}`,
        data: updatedDA
    });

  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
