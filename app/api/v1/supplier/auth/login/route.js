// import connectDB from "@/lib/connectDB";
// import Supplier from "@/models/Supplier";
// import { NextResponse } from "next/server";

// export async function POST(req) {
//   await connectDB();
//   const { email, password } = await req.json();

//   if (!email || !password) {
//     return NextResponse.json({ message: "Email and password required" }, { status: 400 });
//   }

//   const supplier = await Supplier.findOne({ email: email.toLowerCase() });

//   if (!supplier || !(await supplier.isPasswordCorrect(password))) {
//     return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
//   }

//   if (["blocked", "inactive", "rejected"].includes(supplier.status)) {
//     return NextResponse.json(
//       { message: `Account ${supplier.status}` },
//       { status: 403 }
//     );
//   }

//   supplier.lastLogin = new Date();
//   await supplier.save();

//   return NextResponse.json({
//     supplier: supplier.toObject({ versionKey: false }),
//     accessToken: supplier.generateAccessToken(),
//     refreshToken: supplier.generateRefreshToken()
//   });
// }


import { NextResponse } from "next/server";
import connectDB from "@/lib/connectDB";
import Supplier from "@/models/Supplier";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function POST(req) {
  await connectDB();

  try {
    const { email, password } = await req.json();

    // Basic validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find supplier & include password
    const supplier = await Supplier
      .findOne({ email: email.toLowerCase() })
      .select("+password");

    if (!supplier) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, supplier.password);

    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = jwt.sign(
  {
    id: supplier._id,
    role: supplier.role,
    email: supplier.email
  },
  process.env.JWT_ACCESS_SECRET,
  { expiresIn: "1d" }
);

    

    // Update last login
    supplier.lastLogin = new Date();
    await supplier.save({ validateBeforeSave: false });

    // SUCCESS
    return NextResponse.json({
      success: true,
      message: "Login successful",
      token,
      supplier: {
        id: supplier._id,
        email: supplier.email,
        role: supplier.role,
        businessName: supplier.businessName
      }
    });

  } catch (error) {
    console.error("Supplier login error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
