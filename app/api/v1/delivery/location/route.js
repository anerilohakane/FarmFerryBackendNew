
import { NextResponse } from "next/server";
import { authenticateDeliveryAssociate } from "@/middlewares/auth.middleware";
import DeliveryAssociate from "@/models/DeliveryAssociate";
import dbConnect from "@/lib/connectDB";

export async function POST(req) {
  try {
    await dbConnect();
    
    const authResult = await authenticateDeliveryAssociate(req);
    if (!authResult.success) {
        return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.statusCode });
    }

    const { latitude, longitude } = await req.json();

    if (!latitude || !longitude) {
        return NextResponse.json({ success: false, message: "Latitude and Longitude required" }, { status: 400 });
    }

    await DeliveryAssociate.findByIdAndUpdate(authResult.user._id, {
        currentLocation: {
            type: "Point",
            coordinates: [longitude, latitude] // GeoJSON format: [lng, lat]
        }
    });

    return NextResponse.json({
        success: true,
        message: "Location updated"
    });

  } catch (error) {
    console.error("Location Update Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
