import jwt from "jsonwebtoken";

export const generateAccessToken = (customer) => {
  return jwt.sign(
    { userId: customer._id, role: customer.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

export const generateRefreshToken = (customer) => {
  return jwt.sign(
    { userId: customer._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
};
