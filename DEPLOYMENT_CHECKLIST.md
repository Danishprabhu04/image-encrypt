# 🎯 MASTER DEPLOYMENT CHECKLIST

**Complete this checklist to deploy your production system.**

---

## Phase 1: Preparation (15 minutes)

- [ ] **Verify MATLAB Code Integrity**
  ```bash
  # Confirm original files unchanged
  git status
  # Should show: matlab/headless_runner.m (unchanged)
  # Should show: matlab/interactive_tool.m (unchanged)
  ```

- [ ] **Review Repository Structure**
  ```bash
  # Verify all required files exist
  ls backend/app/main.py
  ls backend/requirements.txt
  ls backend/Dockerfile
  ls frontend/src/App_production.tsx
  ls matlab/compile.bat
  ls matlab/compile.sh
  ```

- [ ] **Check Git Status**
  ```bash
  git status
  # Should be clean or only show new deployment files
  ```

---

## Phase 2: MATLAB Compilation (45 minutes)

**Location:** Local Windows machine with MATLAB installed

### Step A: Prepare Compilation Environment
- [ ] Open MATLAB and verify installed version (should be R2023b or newer)
- [ ] Navigate to: `d:\projects\personal_work\aws_project\matlab`
- [ ] Verify `headless_runner.m` file exists and unchanged
- [ ] Create output directory: `mkdir output`

### Step B: Compile MATLAB Code
- [ ] Open PowerShell in `matlab/` directory
- [ ] Run compilation script:
  ```powershell
  .\compile.bat
  ```
- [ ] **Expected output:**
  ```
  output/headless_runner (Linux executable) ✓
  output/run_headless_runner.sh (Shell wrapper) ✓
  output/readme.txt ✓
  ```
- [ ] **Verify no errors** in compilation output
- [ ] Test locally (if you have WSL):
  ```bash
  # In WSL:
  ./output/run_headless_runner.sh encrypt test.png out.png D4P5R3.99
  ```

### Step C: Move Compiled Files to Repository
- [ ] Copy `output/headless_runner` → `matlab/headless_runner`
- [ ] Copy `output/run_headless_runner.sh` → `matlab/run_headless_runner.sh`
- [ ] Verify both files exist:
  ```bash
  ls -la matlab/headless_runner
  ls -la matlab/run_headless_runner.sh
  ```

---

## Phase 3: Commit to GitHub (10 minutes)

### Step A: Stage Changes
- [ ] Add compiled binaries:
  ```bash
  git add matlab/headless_runner
  git add matlab/run_headless_runner.sh
  ```
- [ ] Add deployment files:
  ```bash
  git add backend/app/main.py
  git add backend/app/__init__.py
  git add backend/requirements.txt
  git add backend/Dockerfile
  git add frontend/src/App_production.tsx
  git add frontend/.env.example
  git add DEPLOYMENT_GUIDE.md
  git add MATLAB_COMPILER_SETUP.md
  git add PRODUCTION_DEPLOYMENT_SUMMARY.md
  git add matlab/compile.bat
  git add matlab/compile.sh
  ```

### Step B: Commit
- [ ] Create commit:
  ```bash
  git commit -m "Production deployment: Add FastAPI backend, MATLAB executable, and deployment guides"
  ```

### Step C: Push
- [ ] Push to GitHub:
  ```bash
  git push origin main
  ```
- [ ] **Verify on GitHub:** All files should appear in web interface

---

## Phase 4: Deploy Backend on Render (25 minutes)

### Step A: Create Render Account
- [ ] Go to [render.com](https://render.com)
- [ ] Sign up with GitHub account
- [ ] Authorize Render to access your repositories

### Step B: Create Web Service
- [ ] Click **"New +"** button
- [ ] Select **"Web Service"**
- [ ] **Repository Selection:**
  - [ ] Search for your repository
  - [ ] Select it
  - [ ] Click **"Connect"**

### Step C: Configure Service
- [ ] **Name:** `image-encryption-api` (or your choice)
- [ ] **Environment:** `Docker`
- [ ] **Region:** (closest to you, e.g., `us-east`)
- [ ] **Branch:** `main`
- [ ] **Root Directory:** `backend/`
- [ ] **Plan:** 
  - [ ] Free (for testing) - will have limitations
  - [ ] **Recommended:** Starter ($7/month) for production

### Step D: Environment Variables
- [ ] Click **"Advanced"**
- [ ] No additional env vars needed for basic setup

### Step E: Deploy
- [ ] Click **"Create Web Service"**
- [ ] **Wait for deployment** (typically 15-25 minutes for first build)
- [ ] Watch build logs for:
  - ✅ MATLAB Runtime download starting
  - ✅ Python dependencies installing
  - ✅ Service starting on port 8000

### Step F: Verify Backend
- [ ] **Wait for "Live" status** in Render dashboard
- [ ] **Test health check:**
  ```bash
  curl https://your-service-name.onrender.com/health
  # Should return: {"status":"healthy","service":"Image Encryption API"}
  ```
- [ ] **Note your backend URL** (will look like: `https://image-encryption-api.onrender.com`)

---

## Phase 5: Deploy Frontend on Netlify (20 minutes)

### Step A: Update Frontend Code
- [ ] In your local repo, replace old App:
  ```bash
  cp frontend/src/App_production.tsx frontend/src/App.tsx
  ```
- [ ] Create `.env.local` file:
  ```bash
  echo "VITE_API_BASE_URL=https://your-backend-service.onrender.com" > frontend/.env.local
  ```
  *(Replace URL with your actual Render backend URL)*

### Step B: Commit Changes
- [ ] Stage and commit:
  ```bash
  git add frontend/src/App.tsx
  git add frontend/.env.local
  git commit -m "Update frontend for production: Add API integration"
  git push origin main
  ```

### Step C: Create Netlify Account
- [ ] Go to [netlify.com](https://netlify.com)
- [ ] Sign up with GitHub account
- [ ] Authorize Netlify

### Step D: Deploy on Netlify
- [ ] Click **"Add new site"** → **"Import an existing project"**
- [ ] Select GitHub and find your repository
- [ ] **Configure build settings:**
  - [ ] **Base directory:** `frontend`
  - [ ] **Build command:** `npm run build`
  - [ ] **Publish directory:** `dist`

### Step E: Environment Variables
- [ ] In Netlify dashboard, go to **"Site settings"** → **"Build & deploy"**
- [ ] Add Environment Variable:
  - Key: `VITE_API_BASE_URL`
  - Value: `https://your-backend-service.onrender.com`

### Step F: Deploy
- [ ] Click **"Deploy site"**
- [ ] **Wait for deployment** (typically 2-3 minutes)
- [ ] Netlify will provide you a URL (looks like: `https://your-site.netlify.app`)

### Step G: Verify Frontend
- [ ] **Visit your Netlify URL** in browser
- [ ] Should see encryption form loading
- [ ] Check browser console for errors (F12 → Console tab)

---

## Phase 6: End-to-End Testing (15 minutes)

### Test 1: Upload & Encrypt
- [ ] Open Netlify frontend URL
- [ ] **Select Mode:** "Encrypt"
- [ ] **Upload test image:** (any PNG, JPG, or GIF file)
- [ ] **Enter key:** `D4P5R3.99`
- [ ] **Click "Encrypt"**
- [ ] **Expected behavior:**
  - First request takes 30-60 seconds (MATLAB Runtime startup)
  - Subsequent requests take 10-20 seconds
  - Success message appears
  - Metrics display (Entropy, NPCR, UACI)
  - "Download Result" button becomes active

### Test 2: Download Encrypted Image
- [ ] Click **"Download Result"**
- [ ] Verify file downloads to your Downloads folder
- [ ] Open encrypted image in image viewer
- [ ] Should look scrambled/encrypted (not recognizable)

### Test 3: Decrypt
- [ ] **Select Mode:** "Decrypt"
- [ ] **Upload encrypted image** (from previous test)
- [ ] **Enter same key:** `D4P5R3.99`
- [ ] **Click "Decrypt"**
- [ ] **Expected:** Decrypted image looks like original
- [ ] Download and verify

### Test 4: Error Handling
- [ ] Try uploading with wrong key → should show error
- [ ] Try encrypting with invalid key format → should show error
- [ ] Try uploading non-image file → should show error

### Test 5: Performance
- [ ] Note time for first encryption (30-60s is normal)
- [ ] Note time for second encryption (should be faster, 10-20s)
- [ ] If times are very long (>2min), may need to upgrade Render plan

---

## Phase 7: Production Verification (10 minutes)

### Checklist - Architecture
- [ ] Frontend loads without errors
- [ ] Backend health check returns 200
- [ ] CORS is working (no CORS errors in browser console)
- [ ] API calls complete successfully

### Checklist - Security
- [ ] API only accepts POST requests on /encrypt and /decrypt
- [ ] File validation prevents non-image uploads
- [ ] Temporary files are cleaned up after use
- [ ] No sensitive data in logs

### Checklist - Performance
- [ ] Backend responds to requests within timeout
- [ ] Images download successfully
- [ ] Metrics are calculated and displayed

### Checklist - Documentation
- [ ] DEPLOYMENT_GUIDE.md is comprehensive
- [ ] README.md reflects production architecture
- [ ] Code has comments explaining MATLAB integration

---

## Phase 8: Optimization & Upgrade (Optional)

### For Better Performance
- [ ] **Upgrade Render Plan:**
  - [ ] Free tier → Starter ($7/month)
  - [ ] Eliminates 15-minute inactivity timeout
  - [ ] Provides more resources
  - [ ] Faster cold starts

- [ ] **Cache MATLAB Runtime:**
  - [ ] Docker layer caching reduces rebuild time
  - [ ] Subsequent deployments faster

- [ ] **Monitor Usage:**
  - [ ] Check Render & Netlify dashboards
  - [ ] Set up alerts for errors

### For Additional Features (Future)
- [ ] Add JWT authentication for API
- [ ] Implement image quality metrics
- [ ] Add batch processing capability
- [ ] Create admin dashboard

---

## ✅ Deployment Success Criteria

**You're done when all of these are true:**

- ✅ Render shows "Live" status (green)
- ✅ Netlify shows "Published" (green check)
- ✅ Health check returns 200 OK
- ✅ Frontend loads without errors
- ✅ Can upload image without errors
- ✅ First encryption takes ~60 seconds
- ✅ Metrics display (entropy, NPCR, UACI)
- ✅ Encrypted image downloads correctly
- ✅ Decryption works with same key
- ✅ Browser console shows no errors

---

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| MATLAB Runtime download timeout | Likely network issue on Render. Check build logs. |
| "MATLAB executable not found" | Verify `matlab/run_headless_runner.sh` is in repo. |
| CORS errors | Check `VITE_API_BASE_URL` matches actual backend URL. |
| 60+ second wait time | Normal on free plan. Upgrade to Starter Plan. |
| Service goes to sleep | Free Render sleeps after 15 min. Upgrade to Starter. |
| Image upload fails | Check file size (max 10MB) and format (PNG/JPG/GIF). |

---

## 📊 Expected Performance (Free Tier)

| Metric | Value |
|--------|-------|
| First request | 30-60 seconds |
| Subsequent requests | 10-20 seconds |
| Service cold start | 15-30 seconds |
| Image download | 1-3 seconds |
| Page load (frontend) | <1 second |
| Total startup time | ~2 minutes (first deployment) |

**With Starter Plan:**
- Cold starts eliminated (service always running)
- More RAM/CPU
- Better build times

---

## 📞 If You Get Stuck

1. **Check Render Dashboard:**
   - View build logs for errors
   - Check service logs in real-time
   - Verify resources available

2. **Check Netlify Dashboard:**
   - View build logs
   - Check deploy history
   - Verify environment variables set

3. **Check Browser Console:**
   - Press F12
   - Go to Console tab
   - Look for error messages
   - Check Network tab for API calls

4. **Test API Directly:**
   ```bash
   curl https://your-backend.onrender.com/health
   ```

5. **Review Documentation:**
   - DEPLOYMENT_GUIDE.md (step-by-step)
   - MATLAB_COMPILER_SETUP.md (compilation)
   - PRODUCTION_DEPLOYMENT_SUMMARY.md (overview)

---

## 🎉 Final Steps After Deployment

1. **Save URLs:**
   - Backend: `https://your-app.onrender.com`
   - Frontend: `https://your-site.netlify.app`
   - Repository: `https://github.com/your-username/your-repo`

2. **Monitor Metrics:**
   - Check Render dashboard daily (first few days)
   - Monitor error rates
   - Check build times

3. **Upgrade if Needed:**
   - If experiencing slowness, upgrade Render plan
   - Cost is minimal ($7/month for Starter)

4. **Document Success:**
   - Take screenshot of live deployment
   - Document any customizations made
   - Update project README if needed

---

## 🏁 Deployment Complete!

Your production system is now live and ready to use. 

**You successfully:**
- ✅ Compiled MATLAB code to Linux executable
- ✅ Deployed FastAPI backend with MATLAB Runtime
- ✅ Deployed React frontend with API integration
- ✅ Integrated all components securely
- ✅ Verified end-to-end functionality

Your MATLAB encryption algorithm is now accessible from the web!

---

**Questions?** Refer to the documentation files:
- DEPLOYMENT_GUIDE.md
- MATLAB_COMPILER_SETUP.md  
- PRODUCTION_DEPLOYMENT_SUMMARY.md

