export const asyncHandler = (fn) => async (req, context) => {
  try {
    return await fn(req, context);
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500 }
    );
  }
};
