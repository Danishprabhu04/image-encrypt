# Production Deployment Guide

## 🎯 Overview
This guide walks you through deploying the complete image encryption system:
- **Frontend**: Netlify (React + TypeScript + Vite)
- **Backend**: Render (FastAPI + MATLAB Runtime)
- **MATLAB Code**: Compiled using MATLAB Compiler (unchanged)

---

## ✅ Prerequisites

1. **GitHub Account** - For version control
2. **Render Account** - For backend deployment (free tier available)
3. **Netlify Account** - For frontend deployment (free tier available)
4. **MATLAB with Compiler Toolbox** (local machine only)

---

## 🔧 Step 1: Prepare MATLAB Executable (One-Time Setup)

### On Your Local Windows Machine (with MATLAB installed):

1. Open MATLAB
2. Navigate to your project folder:
   ```matlab
   cd d:\projects\personal_work\aws_project\matlab
   ```

3. Run the compiler:
   ```matlab
   mcc -m headless_runner.m
   ```

   **This generates:**
   - `headless_runner` (Linux executable)
   - `run_headless_runner.sh` (Shell script wrapper)
   - `readme.txt` (Instructions)

4. **Test the generated executable locally** (on Windows, use WSL or run on Linux):
   ```bash
   ./run_headless_runner.sh encrypt test_input.png test_output.png D4P5R3.99
   ```

5. **Commit to GitHub:**
   ```bash
   git add matlab/headless_runner
   git add matlab/run_headless_runner.sh
   git commit -m "Add compiled MATLAB executable"
   git push
   ```

⚠️ **IMPORTANT:** The compiled executable is Linux-specific. You cannot run it on Windows.

---

## 📦 Step 2: Backend Setup (Render)

### 2.1 Push Backend to GitHub

```bash
git push origin main
```

### 2.2 Create Render Web Service

1. Go to [render.com](https://render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account
4. Select your repository
5. Fill in the form:
   - **Name:** `image-encryption-api`
   - **Root Directory:** `backend/`
   - **Runtime:** `Docker`
   - **Branch:** `main`
   - **Port:** `8000`
   - **Plan:** Free (for testing) or Paid (for production)

### 2.3 Configure Environment Variables

Add these in Render dashboard under **Environment**:

```
VITE_API_BASE_URL=https://image-encryption-api.onrender.com
```

### 2.4 Deploy

Click **"Deploy"** and wait (takes 3-5 minutes, first build might take longer due to MATLAB Runtime download).

Once deployment completes:
- ✅ Your API is live at: `https://image-encryption-api.onrender.com`
- 📊 Test health check: `https://image-encryption-api.onrender.com/health`

---

## 🎨 Step 3: Frontend Setup (Netlify)

### 3.1 Update Frontend Code

1. Replace `src/App.tsx` with `src/App_production.tsx`:
   ```bash
   cp frontend/src/App_production.tsx frontend/src/App.tsx
   ```

2. Create `.env.local`:
   ```
   VITE_API_BASE_URL=https://image-encryption-api.onrender.com
   ```

3. Push to GitHub:
   ```bash
   git add .
   git commit -m "Update frontend for production deployment"
   git push
   ```

### 3.2 Deploy on Netlify

1. Go to [netlify.com](https://netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Select GitHub repository
4. Configure build:
   - **Base directory:** `frontend/`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist/`

5. Add Environment Variables:
   - Key: `VITE_API_BASE_URL`
   - Value: `https://image-encryption-api.onrender.com`

6. Click **"Deploy"** and wait (2-3 minutes)

Once live:
- ✅ Your frontend is at: `https://your-site.netlify.app`

---

## 🧪 Step 4: Test the Complete System

1. Open your Netlify frontend URL
2. Upload an image
3. Enter a key: `D4P5R3.99`
4. Click **Encrypt**
5. Check metrics appear and image downloads

### Expected Flow:
```
Browser → Netlify (React)
  ↓ POST /encrypt
Render (FastAPI)
  ↓ subprocess call
MATLAB Runtime
  ↓ returns encrypted image + metrics
Browser → Download encrypted image
```

---

## ⚙️ Configuration Files

### `backend/requirements.txt`
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6
pillow==10.1.0
```

### `backend/Dockerfile`
- Uses `ubuntu:22.04` for MATLAB Runtime compatibility
- Installs R2023b MATLAB Runtime (~1.5 GB)
- Exposes port 8000

### `frontend/.env.example`
```
VITE_API_BASE_URL=https://your-backend.onrender.com
```

---

## 🚨 Important Limitations & Warnings

### Cold Start Time
- **First request takes 30-60 seconds** (MATLAB Runtime initialization)
- Subsequent requests are faster (10-20 seconds)
- Use **paid Render plan** to avoid sleeping and reduce cold starts

### Render Free Plan Issues
- Service sleeps after 15 min of inactivity
- Limited disk space (~400 MB available)
- Limited RAM (~512 MB)
- For production, upgrade to **Starter Plan** ($7/month)

### Docker Image Size
- Base MATLAB Runtime: ~1.5 GB
- Total image: ~2.2 GB
- Build time: 15-20 minutes on Render
- **Paid plans recommended for faster builds**

### File Size Limits
- Max image size: **10 MB** (adjust in FastAPI if needed)
- Encrypted images are similar size to originals
- Temporary files auto-cleanup in `/tmp`

---

## 📊 API Endpoints

### `/encrypt` (POST)
**Request:**
```bash
curl -X POST https://image-encryption-api.onrender.com/encrypt \
  -F "image=@input.png" \
  -F "key=D4P5R3.99"
```

**Response:**
```json
{
  "success": true,
  "session_id": "uuid-here",
  "metrics": {
    "entropy": 7.999,
    "npcr": 99.61,
    "uaci": 33.46
  },
  "download_url": "/download/uuid-here",
  "matlab_output": "..."
}
```

### `/decrypt` (POST)
**Request:**
```bash
curl -X POST https://image-encryption-api.onrender.com/decrypt \
  -F "image=@encrypted.png" \
  -F "key=D4P5R3.99"
```

### `/download/{uid}` (GET)
Returns encrypted image binary

### `/health` (GET)
Health check endpoint

---

## 🔧 Troubleshooting

### Backend Won't Deploy
- Check `backend/Dockerfile` syntax
- Ensure `matlab/run_headless_runner.sh` is in repository
- Check Render build logs for MATLAB Runtime download errors

### Frontend Can't Reach Backend
- Verify `VITE_API_BASE_URL` in Netlify environment
- Check CORS is enabled in `backend/app/main.py`
- Ensure backend service is running (check Render dashboard)

### MATLAB Runtime Errors
- Verify compiled executable was created with `mcc -m headless_runner.m`
- Check key format is `D#P#R#.#`
- View MATLAB output in browser debug console

### Timeout Errors
- MATLAB Runtime takes 30-60 seconds first time
- Upgrade to **paid Render plan** to avoid service sleeping
- Check image file size (shouldn't exceed 10 MB)

---

## 🚀 Production Checklist

- [ ] MATLAB code compiled to Linux executable
- [ ] Executable committed to GitHub
- [ ] Backend deployed on Render
- [ ] Backend health check returns 200
- [ ] Frontend deployed on Netlify
- [ ] `.env` configured with correct API URL
- [ ] CORS working (can make requests from Netlify domain)
- [ ] Test encrypt/decrypt workflow
- [ ] Metrics being calculated and returned
- [ ] Images download correctly
- [ ] Consider upgrading to paid Render plan

---

## 📝 Summary

| Component | Platform | Cost (Free Tier) | Cold Start |
|-----------|----------|------------------|-----------|
| Frontend | Netlify | Free | <1s |
| Backend | Render | Free | 30-60s |
| MATLAB Runtime | Render | Built-in | First run only |

**Total first request:** ~60 seconds
**Subsequent requests:** ~15-20 seconds

---

## ❓ Need Help?

1. **Render Deployment:** https://render.com/docs
2. **Netlify Deployment:** https://docs.netlify.com
3. **FastAPI Documentation:** https://fastapi.tiangolo.com
4. **MATLAB Compiler:** https://www.mathworks.com/products/compiler.html

