import mongoose from "mongoose";

const connectDB = async () => {
  if (mongoose.connections[0].readyState) return;

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB Connected");
};

export default connectDB;
