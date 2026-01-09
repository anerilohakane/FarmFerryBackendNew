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
