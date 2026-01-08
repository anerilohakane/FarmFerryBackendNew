import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Customer from "@/models/Customer";
import { authenticate } from "@/middlewares/auth.middleware";

export async function GET(request) {
    await dbConnect();

    const authResult = await authenticate(request);
    if (!authResult.success) {
        return NextResponse.json(
            { success: false, error: authResult.error },
            { status: authResult.statusCode }
        );
    }

    try {
        const customer = await Customer.findById(authResult.user._id).select("-password -passwordResetToken -passwordResetExpires -passwordResetOTP -passwordResetOTPExpires -phoneOTP -phoneOTPExpires");

        if (!customer) {
            return NextResponse.json(
                { success: false, error: "Customer not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: customer });
    } catch (error) {
        console.error("GET /api/v1/customer error:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

export async function PUT(request) {
    await dbConnect();

    const authResult = await authenticate(request);
    if (!authResult.success) {
        return NextResponse.json(
            { success: false, error: authResult.error },
            { status: authResult.statusCode }
        );
    }

    try {
        const body = await request.json();
        const customerId = authResult.user._id;

        const updates = {};
        if (body.firstName) updates.firstName = body.firstName;
        if (body.lastName) updates.lastName = body.lastName;
        // Phone usually requires verification, but allowing update here for simplicity if needed
        // or assume it's read-only and needs a specific flow.
        // Let's allow simple profile updates.

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { success: false, error: "No fields to update" },
                { status: 400 }
            );
        }

        const updatedCustomer = await Customer.findByIdAndUpdate(
            customerId,
            { $set: updates },
            { new: true, runValidators: true }
        ).select("-password -passwordResetToken -passwordResetExpires -passwordResetOTP -passwordResetOTPExpires -phoneOTP -phoneOTPExpires");

        return NextResponse.json({ success: true, data: updatedCustomer });
    } catch (error) {
        console.error("PUT /api/v1/customer error:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
