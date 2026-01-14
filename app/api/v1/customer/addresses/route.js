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
        // authResult.user IS the customer document.
        // We can just return its addresses, but to be safe/fresh, let's fetch by ID.
        // Note: Customer model doesn't have a 'user' field, it is the user.
        const customer = await Customer.findById(authResult.user._id).select("addresses");

        if (!customer) {
            return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: customer.addresses });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
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
        console.log("POST /customer/addresses received body:", body);

        // Validation
        if (!body.street || !body.city || !body.state || !body.postalCode || !body.country) {
            return NextResponse.json(
                { success: false, error: "Missing required address fields" },
                { status: 400 }
            );
        }

        const customer = await Customer.findById(authResult.user._id);

        if (!customer) {
            return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
        }

        // If setting as default, unset previous default
        if (body.isDefault) {
            customer.addresses.forEach(addr => addr.isDefault = false);
        }
        // If it's the first address, make it default automatically
        else if (customer.addresses.length === 0) {
            body.isDefault = true;
        }

        customer.addresses.push(body);

        await customer.save();

        // Return the newly added address (last one in the array)
        const newAddress = customer.addresses[customer.addresses.length - 1];

        return NextResponse.json({ success: true, data: newAddress }, { status: 201 });

    } catch (error) {
        console.error("POST /api/v1/customer/addresses error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
