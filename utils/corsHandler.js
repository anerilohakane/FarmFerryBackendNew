// export const corsHandler = (req) => {
//   const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'];
//   const origin = req.headers.get('origin');

//   // Determine the appropriate origin to allow
//   let corsOrigin = '*';
//   if (allowedOrigins[0] !== '*' && origin && allowedOrigins.includes(origin)) {
//     corsOrigin = origin;
//   }

//   return {
//     'Access-Control-Allow-Origin': corsOrigin,
//     'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
//     'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
//     'Access-Control-Max-Age': '86400', // 24 hours
//   };
// };


export const corsHandler = (req) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [];

  const origin = req.headers.get('origin');

  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else if (!process.env.ALLOWED_ORIGINS) {
     // Default to wildcard if no env var set (dev mode)
     headers['Access-Control-Allow-Origin'] = '*';
  } else {
     // For strict mode, if origin not allowed, we don't return Allow-Origin header
     // which triggers CORS error in browser.
     // Let's add specific check for localhost to be safe in current setup?
     // No, ALLOWED_ORIGINS=http://localhost:3000 is set.
     // Maybe header is missing on 500 errors?
     // If the OPTIONS route crashes, CORS fails.
  }
  
  return headers;
};

export const handleCors = (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHandler(req),
    });
  }
  return null;
};
