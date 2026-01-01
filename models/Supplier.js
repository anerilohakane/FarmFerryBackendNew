import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    businessName: { 
      type: String, 
      // required: [true, "Business name is required"],   
      trim: true 
    },
    ownerName: { 
      type: String, 
      // required: [true, "Owner name is required"],
      trim: true 
    },
    email: { 
      type: String, 
      required: [true, "Email is required"], 
      unique: true, 
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    password: { 
      type: String, 
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"]
    },
    phone: { 
      type: String,
      // required: [true, "Phone number is required"]
    },
    role: {
      type: String,
      default: "supplier"
    },

    // Business Details
    businessType: { 
      type: String,
      enum: ["farmer", "wholesaler", "retailer", "processor", "other", "Agriculture"],
      // required: [true, "Business type is required"]
    },
    shopName: { 
      type: String,
      trim: true 
    },
    gstNumber: { 
      type: String,
      trim: true 
    },
    panNumber: { 
      type: String,
      trim: true 
    },

    // Address Details
    address: {
      street: { 
        type: String,
        // required: [true, "Street address is required"],
        trim: true 
      },
      city: { 
        type: String,
        // required: [true, "City is required"],
        trim: true 
      },
      state: { 
        type: String,
        // required: [true, "State is required"],
        trim: true 
      },
      country: { 
        type: String,
        // required: [true, "Country is required"],
        trim: true 
      },
      postalCode: { 
        type: String,
        // required: [true, "Postal code .....is required"],
        trim: true 
      },
    },

    // Bank Details
    bankDetails: {
      accountHolderName: { type: String },
      bankName: { type: String },
      accountNumber: { type: String },
      ifscCode: { type: String },
    },

    documents: { type: Array, default: [] },
    // Verification Status
    status: { 
      type: String, 
      enum: ["pending", "approved", "rejected", "active", "inactive", "blocked"], 
      default: "pending" 
    },
    verificationNotes: { 
      type: String 
    },
    verifiedAt: { 
      type: Date 
    },
    verifiedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Admin" 
    },

    // Password Reset
    passwordResetToken: { 
      type: String 
    },
    passwordResetExpires: { 
      type: Date 
    },

    // Phone Verification
    phoneVerificationToken: {
      type: String,
    },
    phoneVerificationExpires: {
      type: Date,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    // Performance & Activity
    totalOrders: {
      type: Number,
      default: 0 
    },
    totalRevenue: { 
      type: Number, 
      default: 0 
    },
    lastLogin: { 
      type: Date 
    }
  },
  { timestamps: true }
);


// Prevent model overwrite error in development
if (mongoose.models.Supplier) {
  delete mongoose.models.Supplier;
}

const Supplier = mongoose.model("Supplier", supplierSchema);

export default Supplier;