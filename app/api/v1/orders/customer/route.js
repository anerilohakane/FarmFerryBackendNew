import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Order from "@/models/Order";
import Customer from "@/models/Customer";
import { authenticate } from "@/middlewares/auth.middleware";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    await dbConnect();

    // 🔐 Authenticate
    const authResult = await authenticate(req);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error || "Unauthorized" },
        { status: authResult.statusCode || 401 }
      );
    }

    const { user } = authResult;
    console.log(`✅ [MyOrders] Fetching orders for user: ${user._id} (${user.name || 'No Name'})`);

    // --- STRATEGY: Find ALL related customer profiles ---
    // User might have multiple accounts due to different phone formats or logins.

    let allCustomerIds = [user._id.toString()];

    // Gather user's phone numbers if available
    const userPhones = [];
    if (user.phone) userPhones.push(user.phone);
    if (user.mobile) userPhones.push(user.mobile);

    // Clean to strict digits for database searching
    const searchPhones = userPhones
      .map(p => p.toString().replace(/\D/g, '')) // Remove non-digits
      .filter(p => p.length >= 10);   // Keep only valid-looking numbers

    const uniquePhones = [...new Set(searchPhones)];
    console.log(`🔍 [MyOrders] Search Phones:`, uniquePhones);

    if (uniquePhones.length > 0) {
      try {
        // Find other Customer profiles that share any of these phone numbers
        const phoneRegexes = uniquePhones.map(p => new RegExp(p.slice(-10)));

        const relatedCustomers = await Customer.find({
          _id: { $ne: user._id }, // Don't find self again
          $or: [
            { phone: { $in: phoneRegexes } },
            { mobile: { $in: phoneRegexes } }
          ]
        }).select('_id phone mobile');

        if (relatedCustomers.length > 0) {
          const relatedIds = relatedCustomers.map(c => c._id.toString());
          console.log(`🔗 [MyOrders] Found related accounts:`, relatedIds);
          allCustomerIds = [...allCustomerIds, ...relatedIds];
        }
      } catch (err) {
        console.error("Error finding related customers:", err);
      }
    }

    // Deduplicate IDs and convert to ObjectIds
    const uniqueIdStrings = [...new Set(allCustomerIds)];
    const queryIds = uniqueIdStrings.map(id => new mongoose.Types.ObjectId(id));

    console.log(`📦 [MyOrders] Querying for Customer IDs:`, uniqueIdStrings);

    // --- CONSTRUCT QUERY ---
    // 1. Match by Customer ID
    const query = {
      $or: [
        { customer: { $in: queryIds } }
      ]
    };

    // 2. Match by Delivery Address Phone (Safety net for guest checkouts or unlinked orders)
    if (uniquePhones.length > 0) {
      uniquePhones.forEach(digits => {
        // Match last 10 digits in delivery phone
        const last10 = digits.slice(-10);
        query.$or.push({ 'deliveryAddress.phone': { $regex: last10, $options: 'i' } });
      });
    }

    // Fetch orders
    const orders = await Order.find(query)
      .populate({
        path: "items.product",
        select: "name price images description category"
      })
      .sort({ createdAt: -1 });

    console.log(`✅ [MyOrders] Found ${orders.length} orders total.`);

    return NextResponse.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error("❌ [MyOrders] Error fetching orders:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
