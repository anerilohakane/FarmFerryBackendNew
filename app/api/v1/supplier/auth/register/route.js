// import Supplier from "@/models/Supplier";
// import { NextResponse } from "next/server";
// import connectDB from "@/lib/connectDB";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Supplier from "@/models/Supplier";
import bcrypt from "bcrypt";


export async function POST(request) {
  try {
    // Connect to database
    await dbConnect();

    // Parse request body
    const body = await request.json();
    const { ownerName, email, phone, businessName, password } = body;

    // Validate required fields
    if (!ownerName || !email || !phone || !businessName || !password) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Owner name, email, phone, business name, and password are required",
        },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    // Check for existing email
    const existingSupplierByEmail = await Supplier.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingSupplierByEmail) {
      return NextResponse.json(
        { success: false, message: "Email is already registered" },
        { status: 409 }
      );
    }

    // Check for existing phone
    const existingSupplierByPhone = await Supplier.findOne({
      phone: phone.trim(),
    });

    if (existingSupplierByPhone) {
      return NextResponse.json(
        { success: false, message: "Phone number is already registered" },
        { status: 409 }
      );
    }

    // Hash password (schema has no pre-save hook)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new supplier
    const supplier = new Supplier({
      ownerName: ownerName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      businessName: businessName.trim(),
      password: hashedPassword,
      role: "supplier",
      status: "pending",
      lastLogin: new Date(),
    });

    // Save supplier
    await supplier.save();

    // Prepare response (remove sensitive data)
    const createdSupplier = {
      _id: supplier._id,
      ownerName: supplier.ownerName,
      email: supplier.email,
      phone: supplier.phone,
      businessName: supplier.businessName,
      role: supplier.role,
      status: supplier.status,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };

    return NextResponse.json(
      {
        success: true,
        message: "Supplier registered successfully",
        data: createdSupplier,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);

    let statusCode = 500;
    let errorMessage = "Internal server error";

    if (error.name === "ValidationError") {
      statusCode = 400;
      errorMessage = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
    } else if (error.code === 11000) {
      statusCode = 409;
      errorMessage = "Duplicate key error";
    }

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
      },
      { status: statusCode }
    );
  }
}


// // Optional: Add other HTTP methods if needed
// export async function GET() {
//   return NextResponse.json(
//     { 
//       success: false, 
//       message: "Method not allowed" 
//     },
//     { status: 405 }
//   );
// }

// export async function PUT() {
//   return NextResponse.json(
//     { 
//       success: false, 
//       message: "Method not allowed" 
//     },
//     { status: 405 }
//   );
// }

// export async function DELETE() {
//   return NextResponse.json(
//     { 
//       success: false, 
//       message: "Method not allowed" 
//     },
//     { status: 405 }
//   );
// }



// import Supplier from "@/models/Supplier";
// import { NextResponse } from "next/server";
// import connectDB from "@/lib/connectDB";

// export async function POST(request) {
//   try {
//     // Connect to database
//     await connectDB();
    
//     // Parse request body
//     const body = await request.json();
//     const { fullName, email, phoneNumber, businessName, password } = body;

//     // Validate required fields
//     if (!fullName || !email || !phoneNumber || !businessName || !password) {
//       return NextResponse.json(
//         { 
//           success: false, 
//           message: "Full name, email, phone number, business name, and password are required" 
//         },
//         { status: 400 }
//       );
//     }

//     // Validate password length
//     if (password.length < 6) {
//       return NextResponse.json(
//         { 
//           success: false, 
//           message: "Password must be at least 6 characters" 
//         },
//         { status: 400 }
//       );
//     }

//     // Validate email format
//     const emailRegex = /^\S+@\S+\.\S+$/;
//     if (!emailRegex.test(email)) {
//       return NextResponse.json(
//         { 
//           success: false, 
//           message: "Please provide a valid email address" 
//         },
//         { status: 400 }
//       );
//     }

//     // Check for existing email (case-insensitive)
//     const existingSupplierByEmail = await Supplier.findOne({ 
//       email: email.toLowerCase().trim() 
//     });
    
//     if (existingSupplierByEmail) {
//       return NextResponse.json(
//         { 
//           success: false, 
//           message: "Email is already registered" 
//         },
//         { status: 409 }
//       );
//     }

//     // Check for existing phone number
//     const existingSupplierByPhone = await Supplier.findOne({ 
//       phone: phoneNumber.trim() 
//     });
    
//     if (existingSupplierByPhone) {
//       return NextResponse.json(
//         { 
//           success: false, 
//           message: "Phone number is already registered" 
//         },
//         { status: 409 }
//       );
//     }

//     // Create new supplier with plain password (it will be hashed by pre-save hook)
//     const supplier = new Supplier({
//       ownerName: fullName.trim(),
//       email: email.toLowerCase().trim(),
//       phone: phoneNumber.trim(),
//       businessName: businessName.trim(),
//       password: password, // Plain password - pre-save hook will hash it
//       role: "supplier",
//       status: "pending",
//       lastLogin: new Date(),
//     });

//     // Save supplier (triggers pre-save hook for password hashing)
//     await supplier.save();

//     // Remove sensitive fields from response
//     const createdSupplier = {
//       _id: supplier._id,
//       ownerName: supplier.ownerName,
//       email: supplier.email,
//       phone: supplier.phone,
//       businessName: supplier.businessName,
//       role: supplier.role,
//       status: supplier.status,
//       createdAt: supplier.createdAt,
//       updatedAt: supplier.updatedAt,
//     };

//     // Create response - Removed token generation
//     return NextResponse.json({
//       success: true,
//       message: "Supplier registered successfully",
//       data: {
//         user: createdSupplier,
//       }
//     }, { status: 201 });

//   } catch (error) {
//     console.error("Register error:", error);
    
//     // Handle specific error types
//     let statusCode = 500;
//     let errorMessage = "Internal server error";

//     if (error.name === 'ValidationError') {
//       statusCode = 400;
//       errorMessage = Object.values(error.errors).map(err => err.message).join(', ');
//     } else if (error.name === 'MongoError' && error.code === 11000) {
//       statusCode = 409;
//       errorMessage = "Duplicate key error - Email or phone already exists";
//     } else if (error.name === 'CastError') {
//       statusCode = 400;
//       errorMessage = "Invalid data format";
//     }

//     return NextResponse.json(
//       { 
//         success: false, 
//         message: errorMessage,
//         error: process.env.NODE_ENV === 'development' ? error.message : undefined
//       },
//       { status: statusCode }
//     );
//   }
// }

// // Optional: Add other HTTP methods if needed
// export async function GET() {
//   return NextResponse.json(
//     { 
//       success: false, 
//       message: "Method not allowed" 
//     },
//     { status: 405 }
//   );
// }

// export async function PUT() {
//   return NextResponse.json(
//     { 
//       success: false, 
//       message: "Method not allowed" 
//     },
//     { status: 405 }
//   );
// }

// export async function DELETE() {
//   return NextResponse.json(
//     { 
//       success: false, 
//       message: "Method not allowed" 
//     },
//     { status: 405 }
//   );
// }