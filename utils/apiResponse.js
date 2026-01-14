export const apiResponse = (status, success, message, data = null) => {
    return new Response(
        JSON.stringify({
            success,
            message,
            ...(data && { data }),
        }),
        {
            status,
            headers: {
                "Content-Type": "application/json",
                // We can't easily do dynamic CORS here without the request object, 
                // but we can add wildcard or assume it's handled by middleware if it existed.
                // For now, let's just return the response. 
                // Ideally, the caller should attach CORS headers or this function should accept them.
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
        }
    );
};
