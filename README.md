# Running Club Drive Uploader

A private upload portal where photographers can upload photos and videos directly into a group Gmail account's Google Drive, without using their own storage.

## How It Works

- Photographers authenticate with a simple access code (no Google login)
- The backend uploads files to Google Drive using the group Gmail account's OAuth token
- Files belong to and consume storage of the group account (`madregot.club@gmail.com`)
- The frontend never receives Google tokens

## Setup

### 1. Create Google Cloud Project

1. Go to https://console.cloud.google.com
2. Create a new project (e.g., "Running Club Uploader")
3. Enable the **Google Drive API**
4. Go to **APIs & Services > OAuth consent screen**
   - Choose "External" user type
   - Fill in app name, support email
   - Add scope: `https://www.googleapis.com/auth/drive`
   - Add the group Gmail account as a test user
5. Go to **APIs & Services > Credentials**
   - Create OAuth 2.0 Client ID (type: Web application)
   - Add authorized redirect URI: `http://localhost:3000/api/oauth/callback`
   - Note your Client ID and Client Secret

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Fill in:
- `GOOGLE_CLIENT_ID` - from step 1
- `GOOGLE_CLIENT_SECRET` - from step 1
- `GOOGLE_REDIRECT_URI` - `http://localhost:3000/api/oauth/callback`
- `APP_ACCESS_CODE` - choose a code to share with photographers
- `SESSION_SECRET` - random string, 32+ characters

### 3. Get Refresh Token

```bash
npm install
npm run dev
# In another terminal:
npx tsx scripts/get-google-refresh-token.ts
```

Open the printed URL in a browser where you're logged in as `madregot.club@gmail.com`. Grant access. Copy the refresh token from the callback page into `.env.local` as `GOOGLE_REFRESH_TOKEN`.

### 4. Set Root Folder

1. In Google Drive (as the group account), create or choose the root folder for uploads
2. Copy the folder ID from the URL: `https://drive.google.com/drive/folders/<THIS_IS_THE_ID>`
3. Set `GOOGLE_DRIVE_ROOT_FOLDER_ID` in `.env.local`

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000 and enter the access code.

## Deployment

Deploy to any Node.js hosting (Vercel, Railway, etc.). Set all environment variables from `.env.example` in your hosting provider's settings.

For production, make sure to:
- Use a strong `SESSION_SECRET`
- Use a strong `APP_ACCESS_CODE`
- Set `GOOGLE_REDIRECT_URI` to your production domain's callback URL
- If the OAuth consent screen is in "Testing" mode, publish it or keep the group email as a test user

## Security Notes

- The `GOOGLE_REFRESH_TOKEN` grants broad access to the group account's Drive. Protect it carefully.
- Never expose the refresh token to the frontend.
- Photographers only authenticate with the access code.
- The app validates that all folder operations stay within the configured root folder.
- File uploads are validated for type and size.

## Storage Ownership

Files uploaded through this app are created by the backend using the group account's OAuth credentials. This means:
- Files are owned by `madregot.club@gmail.com`
- Storage is consumed from the group account's quota
- Photographers don't need a Google account or any Drive storage
