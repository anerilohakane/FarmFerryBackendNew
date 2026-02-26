import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Customer from "@/models/Customer";
import { authenticate } from "@/middlewares/auth.middleware";

export async function PUT(request, props) {
    const params = await props.params;
    await dbConnect();

    const authResult = await authenticate(request);
    if (!authResult.success) {
        return NextResponse.json(
            { success: false, error: authResult.error },
            { status: authResult.statusCode }
        );
    }

    try {
        const { id: addressId } = params;
        const body = await request.json();

        const customer = await Customer.findById(authResult.user._id);
        if (!customer) return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });

        const address = customer.addresses.id(addressId);
        if (!address) {
            return NextResponse.json({ success: false, error: "Address not found" }, { status: 404 });
        }

        // Update fields
        if (body.name) address.name = body.name;
        if (body.type) address.type = body.type;
        if (body.street) address.street = body.street;
        if (body.city) address.city = body.city;
        if (body.state) address.state = body.state;
        if (body.postalCode) address.postalCode = body.postalCode;
        if (body.country) address.country = body.country;
        if (body.phone) address.phone = body.phone;

        // Handle isDefault
        if (body.isDefault === true && !address.isDefault) {
            // user wants to set this as default, unset others directly on the mongoose array
            customer.addresses.forEach(a => {
                if (a._id.toString() !== addressId) a.isDefault = false;
            });
            address.isDefault = true;
        } else if (body.isDefault === false && address.isDefault) {
            // user wants to unset default? generally we shouldn't allow having NO default if there are addresses
            // but let's allow it for now, or just ignore false.
            address.isDefault = false;
        }

        await customer.save();

        return NextResponse.json({ success: true, data: address });

    } catch (error) {
        console.error("PUT /api/v1/customer/addresses/[id] error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, props) {
    const params = await props.params;
    await dbConnect();

    const authResult = await authenticate(request);
    if (!authResult.success) {
        return NextResponse.json(
            { success: false, error: authResult.error },
            { status: authResult.statusCode }
        );
    }

    try {
        const { id: addressId } = params;

        const customer = await Customer.findById(authResult.user._id);
        if (!customer) return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });

        const address = customer.addresses.id(addressId);
        if (!address) {
            return NextResponse.json({ success: false, error: "Address not found" }, { status: 404 });
        }

        // Remove the address
        address.deleteOne();

        await customer.save();

        return NextResponse.json({ success: true, message: "Address deleted successfully" });
    } catch (error) {
        console.error("DELETE /api/v1/customer/addresses/[id] error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
