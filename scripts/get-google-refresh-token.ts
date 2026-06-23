/**
 * Script to generate a Google OAuth refresh token for the group Gmail account.
 *
 * Prerequisites:
 * 1. Create a Google Cloud project at https://console.cloud.google.com
 * 2. Enable the Google Drive API
 * 3. Create OAuth 2.0 credentials (Web application type)
 * 4. Add http://localhost:3000/api/oauth/callback as an authorized redirect URI
 * 5. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env.local
 *
 * Usage:
 *   npx tsx scripts/get-google-refresh-token.ts
 *
 * This will print a URL. Open it in a browser where you're logged into the
 * group Gmail account (madregot.club@gmail.com). After granting access, the
 * refresh token will be displayed on the callback page.
 */

import { google } from "googleapis";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri =
  process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/oauth/callback";

if (!clientId || !clientSecret) {
  console.error(
    "Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env.local"
  );
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/drive"],
});

console.log("\n=== Google OAuth Setup ===\n");
console.log("1. Make sure you are logged into Google as: madregot.club@gmail.com");
console.log("2. Open this URL in your browser:\n");
console.log(authUrl);
console.log("\n3. Grant the requested permissions.");
console.log("4. You will be redirected to your local server.");
console.log("   Make sure the Next.js dev server is running (npm run dev).");
console.log("5. Copy the refresh token from the page and add it to .env.local as GOOGLE_REFRESH_TOKEN.");
console.log("\n=========================\n");
