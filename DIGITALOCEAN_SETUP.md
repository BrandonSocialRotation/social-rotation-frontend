# DigitalOcean Frontend Deployment - Fix Instructions

## Problem
DigitalOcean is treating the frontend as a "Web Service" instead of a "Static Site", causing the error:
```
failed to launch: determine start command: when there is no default process a command is required
```

## Solution: Change Component Type in Dashboard

### Step-by-Step Fix:

1. **Go to your DigitalOcean Dashboard**
   - Navigate to: Apps → Your Frontend App (`social-rotation-frontend`)

2. **Edit the Component**
   - Click on **"Settings"** tab
   - Click on **"Components"** section
   - Find the component (likely named "frontend" or "social-rotation-frontend")
   - Click **"Edit"** or the component name

3. **Change Component Type**
   - Look for **"Type"** dropdown/select
   - Change it from **"Web Service"** to **"Static Site"**
   - Click **"Save"** or **"Continue"**

4. **Configure Static Site Settings**
   - **Build Command**: `npm ci && npm run build`
   - **Output Directory**: `dist`
   - **Catchall Document**: `index.html`
   - **Environment Variables**:
     - `VITE_API_BASE_URL` = `https://new-social-rotation-backend-qzyk8.ondigitalocean.app/api/v1`

5. **Remove Web Service Settings**
   - Make sure there is **NO** "Run Command" field
   - Make sure there is **NO** "Health Check" configuration
   - Static Sites don't need these

6. **Save and Deploy**
   - Click **"Save"** or **"Deploy"**
   - Wait for the build to complete

## Alternative: Delete and Recreate

If you can't edit the component type:

1. **Delete Current App**
   - Go to Settings → Danger Zone → Delete App

2. **Create New App**
   - Click "Create App"
   - Choose "From GitHub"
   - Select repository: `BrandonSocialRotation/social-rotation-frontend`
   - Select branch: `main`

3. **Configure Build**
   - DigitalOcean should detect it's a Vite/React app
   - **IMPORTANT**: When it asks for component type, select **"Static Site"** (NOT "Web Service")
   - Build Command: `npm ci && npm run build`
   - Output Directory: `dist`
   - Catchall Document: `index.html`

4. **Add Environment Variable**
   - Go to Settings → App-Level Environment Variables
   - Add: `VITE_API_BASE_URL` = `https://new-social-rotation-backend-qzyk8.ondigitalocean.app/api/v1`
   - **IMPORTANT**: Set scope to "Build Time" (Vite needs this at build time)

5. **Deploy**
   - Click "Create Resources" or "Deploy"
   - Wait for build to complete

## Verification

After deployment, verify:
- ✅ No "Run Command" in component settings
- ✅ No "Health Check" in component settings
- ✅ Component type shows "Static Site"
- ✅ Build completes successfully
- ✅ App is accessible via URL

## Troubleshooting

If you still see errors:
1. Make sure the component type is "Static Site", not "Web Service"
2. Verify `.do/app.yaml` is in the root of your repository
3. Check that `dist` folder is generated during build (check build logs)
4. Ensure environment variable `VITE_API_BASE_URL` is set at build time

