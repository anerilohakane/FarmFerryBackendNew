export const apiResponse = (status, success, message, data = null) => {
  return new Response(
    JSON.stringify({ success, message, data }),
    { status }
  );
};
