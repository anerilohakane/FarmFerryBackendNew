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

  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  };
};

// export const handleCors = async (req) => {
//   if (req.method === 'OPTIONS') {
//     const headers = corsHandler(req);
//     return new Response(null, {
//       status: 200,
//       headers,
//     });
//   }
//   return null;
// };



export const handleCors = (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHandler(req),
    });
  }
  return null;
};