import { NextResponse } from 'next/server';

export function middleware(request) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [];
  
  const origin = request.headers.get('origin');
  
  if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'].includes(request.method)) {
      // Handle Preflight and Simple Requests
      const response = request.method === 'OPTIONS' 
         ? new NextResponse(null, { status: 204 }) 
         : NextResponse.next();

      if (origin && allowedOrigins.includes(origin)) {
          response.headers.set('Access-Control-Allow-Origin', origin);
      } else {
          // Fallback for development convenience or strict blocking
          // response.headers.set('Access-Control-Allow-Origin', '*'); // Optional: Too permissive
      }

      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Max-Age', '86400');

      if (request.method === 'OPTIONS') {
          return response;
      }
      
      return response;
  }
}

export const config = {
  matcher: '/api/:path*',
};
