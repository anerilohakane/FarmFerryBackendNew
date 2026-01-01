import jwt from "jsonwebtoken";
import Customer from "@/models/Customer";
import Supplier from "@/models/Supplier";
import SuperAdmin from "@/models/SuperAdmin";
import Admin from "@/models/Admin";
import dbConnect from "@/lib/connectDB";
import DeliveryAssociate from "@/models/DeliveryAssociate";
/**
 * Verify JWT token and return user object
 */
export const verifyJWT = async (token) => {
  try {
    if (!token) {
      return { error: "Unauthorized - No token provided", statusCode: 401 };
    }

    // Verify token
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || 'fallback_access_token_secret');

    // Connect to database
    await connectDB();

    // Find user based on token info
    let user;
    if (decodedToken.role === "superadmin") {
      user = await SuperAdmin.findById(decodedToken.id).select("-password");
    } else if (decodedToken.role === "admin") {
      user = await Admin.findById(decodedToken.id).select("-password");
    } else if (decodedToken.role === "supplier") {
      user = await Supplier.findById(decodedToken.id).select("-password");
    } else if (decodedToken.role === "deliveryAssociate") {
      const DeliveryAssociate = (await import("@/models/DeliveryAssociate")).default;
      user = await DeliveryAssociate.findById(decodedToken.id).select("-password -passwordResetToken -passwordResetExpires");
    } else {
      user = await Customer.findById(decodedToken.id).select("-password");
    }

    if (!user) {
      return { error: "Invalid token - User not found", statusCode: 401 };
    }

    return { user, role: decodedToken.role };
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return { error: "Invalid token", statusCode: 401 };
    }
    if (error.name === "TokenExpiredError") {
      return { error: "Token expired", statusCode: 401 };
    }
    return { error: error.message || "Invalid token", statusCode: 401 };
  }
};

/**
 * Verify token for Next.js API routes
 * Use this in your API route handlers
 */
export const authenticate = async (request) => {
  try {
    // Get token from authorization header or cookies
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || null;

    const result = await verifyJWT(token);
    
    if (result.error) {
      return { 
        success: false, 
        error: result.error, 
        statusCode: result.statusCode 
      };
    }
    
    return { 
      success: true, 
      user: result.user, 
      role: result.role 
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return { 
      success: false, 
      error: "Authentication failed", 
      statusCode: 401 
    };
  }
};

/**
 * Verify token for supplier-specific routes
 */
export const authenticateSupplier = async (request) => {
  const authResult = await authenticate(request);
  
  if (!authResult.success) {
    return authResult;
  }
  
  if (authResult.role !== 'supplier') {
    return {
      success: false,
      error: "Access denied. Supplier role required.",
      statusCode: 403
    };
  }
  
  return authResult;
};

/**
 * Check if user has required role
 * @param {string[]} allowedRoles - Allowed roles
 */
export const requireRole = (allowedRoles) => {
  return async (request) => {
    const authResult = await authenticate(request);
    
    if (!authResult.success) {
      return authResult;
    }
    
    if (!allowedRoles.includes(authResult.role)) {
      return {
        success: false,
        error: `Role: ${authResult.role} is not allowed to access this resource`,
        statusCode: 403
      };
    }
    
    return authResult;
  };
};

/**
 * Check if supplier is verified
 */
export const requireVerifiedSupplier = async (request) => {
  const authResult = await authenticateSupplier(request);
  
  if (!authResult.success) {
    return authResult;
  }
  
  if (authResult.user.status !== "approved") {
    return {
      success: false,
      error: "Your account is not verified yet. Please wait for admin approval.",
      statusCode: 403
    };
  }
  
  return authResult;
};

/**
 * Simplified supplier authentication helper
 * Use this directly in your supplier API routes
 */
export const authenticateSupplierToken = async (token) => {
  const result = await verifyJWT(token);
  
  if (result.error) {
    return null;
  }
  
  if (result.role !== 'supplier') {
    return null;
  }
  
  return result.user;
};