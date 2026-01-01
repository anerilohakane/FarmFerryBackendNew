import mongoose from 'mongoose';

const superAdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  avatar: { type: String },
  phone: { type: String },
  location: { type: String },
  company: { type: String },
  lastLogin: { type: Date },
}, { timestamps: true });

delete mongoose.models.SuperAdmin;
const SuperAdmin = mongoose.model('SuperAdmin', superAdminSchema);
export default SuperAdmin; 