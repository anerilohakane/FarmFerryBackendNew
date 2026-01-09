import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dqcco3o9i',
  api_key: process.env.CLOUDINARY_API_KEY || '291292164537733',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'PK9mtaQOwXa_lcZ2mPpGbklGDRg',
});

export default cloudinary;
