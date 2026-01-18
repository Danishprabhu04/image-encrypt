# Quick Start: Production Deployment

## 📋 Files Created/Modified

### Backend
- ✅ `backend/app/main.py` - FastAPI application with encryption endpoints
- ✅ `backend/app/__init__.py` - Package init file
- ✅ `backend/requirements.txt` - Python dependencies (updated)
- ✅ `backend/Dockerfile` - Production container with MATLAB Runtime (updated)

### Frontend
- ✅ `frontend/src/App_production.tsx` - Updated React component with API integration
- ✅ `frontend/.env.example` - Environment configuration template

### Documentation
- ✅ `DEPLOYMENT_GUIDE.md` - Complete step-by-step deployment instructions
- ✅ `MATLAB_COMPILER_SETUP.md` - This file

### Compilation Scripts
- ✅ `matlab/compile.bat` - Windows compilation script
- ✅ `matlab/compile.sh` - macOS/Linux compilation script

---

## 🚀 Quick Start (5 Steps)

### Step 1: Compile MATLAB (Local Machine)
```bash
# On Windows with MATLAB installed:
cd matlab
compile.bat

# On macOS/Linux:
cd matlab
bash compile.sh
```

### Step 2: Commit Compiled Executable
```bash
git add matlab/headless_runner
git add matlab/run_headless_runner.sh
git commit -m "Add compiled MATLAB executable"
git push
```

### Step 3: Deploy Backend on Render
1. Go to [render.com](https://render.com)
2. New Web Service → Select your GitHub repo
3. Configure:
   - Root: `backend/`
   - Runtime: Docker
   - Port: 8000
4. Deploy (takes 15-20 minutes)

### Step 4: Update Frontend
```bash
# Replace old App.tsx with production version
cp frontend/src/App_production.tsx frontend/src/App.tsx

# Create .env.local with your backend URL
echo "VITE_API_BASE_URL=https://your-api.onrender.com" > frontend/.env.local

git add -A
git commit -m "Update frontend for production"
git push
```

### Step 5: Deploy Frontend on Netlify
1. Go to [netlify.com](https://netlify.com)
2. Connect GitHub repository
3. Configure:
   - Base: `frontend/`
   - Build: `npm run build`
   - Publish: `dist/`
   - Add env: `VITE_API_BASE_URL=<your-render-url>`
4. Deploy (takes 2-3 minutes)

---

## ✅ Architecture

```
Netlify (React)
    ↓ HTTPS
Render (FastAPI) ← MATLAB Runtime installed
    ↓ subprocess
MATLAB Executable ← Compiled from headless_runner.m (UNCHANGED)
    ↓
Encrypted Image + Metrics
```

---

## 🔐 Your MATLAB Code

✅ **Not Modified** - Your original code is untouched:
- `matlab/headless_runner.m` - Original
- `matlab/interactive_tool.m` - Original (local demo only)

💾 **What Gets Compiled**:
- `headless_runner.m` → Linux executable via MATLAB Compiler
- Executable runs as subprocess from FastAPI
- Input/output via files
- Metrics parsed from stdout

---

## 📊 Expected Performance

| Step | Time |
|------|------|
| First request (MATLAB Runtime init) | 30-60 seconds |
| Subsequent requests | 10-20 seconds |
| Frontend page load | <1 second |

**Recommendation:** Upgrade to Render Starter Plan ($7/month) to avoid cold starts and service sleeping.

---

## 🧪 Testing

### Local Testing (Before Deployment)
```bash
# Terminal 1: Start backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Terminal 2: Start frontend
cd frontend
npm install
npm run dev
```

### Production Testing (After Deployment)
1. Open Netlify URL in browser
2. Upload image
3. Click Encrypt
4. Verify metrics appear
5. Download and check encrypted image

---

## 📚 Documentation Links

- [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) - Full deployment guide
- [Render Documentation](https://render.com/docs)
- [Netlify Documentation](https://docs.netlify.com)
- [FastAPI Guide](https://fastapi.tiangolo.com)
- [MATLAB Compiler](https://www.mathworks.com/products/compiler.html)

---

## ❓ FAQs

**Q: Do I modify the MATLAB code?**
A: No. Your code is compiled to an executable and called via subprocess.

**Q: Can I run the compiled executable on Windows?**
A: No. The compiled binary is Linux-specific. It runs on Render (Linux container).

**Q: Why does it take so long to process?**
A: MATLAB Runtime has a ~30-second cold start. This is normal.

**Q: How much does it cost?**
A: Free tier available. For production, ~$7/month (Render Starter).

**Q: Can I use a different encryption algorithm?**
A: Yes, just compile a different MATLAB function using `mcc`.

---

## 🎉 Success Indicators

- [ ] MATLAB code compiles without errors
- [ ] Backend deploys successfully on Render
- [ ] Frontend deploys successfully on Netlify
- [ ] Test image uploads and encrypts
- [ ] Metrics display correctly
- [ ] Encrypted image downloads
- [ ] Decryption works with same key

**Once all checked, your system is production-ready!** 🚀

