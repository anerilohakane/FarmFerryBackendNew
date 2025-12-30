// app/api/v1/test/route.js
import dbConnect from '@/lib/connectDB'; // Adjust the import path as needed
import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🔍 /api/test-connection called');
  
  try {
    console.log('🔗 Attempting to connect to MongoDB...');

    
    // Attempt to connect to MongoDB
    const connection = await dbConnect();

    
    // Get connection details
    const dbStatus = connection.connection.readyState;
    const dbName = connection.connection.db?.databaseName || 'Unknown';

    
    console.log('✅ Connection test successful');
    
    return NextResponse.json({
      success: true,
      message: 'MongoDB connection successful',
      data: {
        connected: true,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'MongoDB connection failed',
      error: error.message,
      details: {
        errorCode: error.code,
        errorName: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}