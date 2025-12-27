This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## CORS Configuration

This project includes CORS (Cross-Origin Resource Sharing) configuration to allow frontend applications to communicate with the backend API.

### Configuration

CORS settings are configured in the following files:

1. **Environment Variables** (`/.env.local`):
   - `ALLOWED_ORIGINS`: Comma-separated list of allowed origins (e.g., `http://localhost:3000,http://localhost:3001`)
   - If not set, defaults to `*` (allow all origins, not recommended for production)

2. **Next.js Configuration** (`/next.config.mjs`):
   - Sets CORS headers at the server level for all API routes

3. **API Response Utility** (`/utils/apiResponse.js`):
   - Adds CORS headers to all API responses

4. **CORS Handler Utility** (`/utils/corsHandler.js`):
   - Provides functions to handle CORS preflight requests (OPTIONS)

### API Routes

All API routes in `/app/api/v1/auth/` have been updated to handle CORS:
- Added OPTIONS method handlers for preflight requests
- Integrated CORS handling in all POST/GET methods

### Security Note

For production environments, avoid using `*` for `ALLOWED_ORIGINS`. Instead, specify the exact origins that are allowed to access your API.
