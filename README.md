# DNA-Chaos Encryption System

This project implements a secure DNA-based Chaotic Encryption algorithm using MATLAB for the cryptographic core and Python (FastAPI) as a controlling backend.

## Architecture

### Production Stack
```
Netlify (React Frontend)
    ↓ HTTPS
Render (FastAPI Backend)
    ↓ subprocess
MATLAB Runtime (Compiled Executable)
    ↓
Encrypted Image + Metrics
```

### Components
- **Frontend**: React + TypeScript + Vite (Netlify)
- **Backend**: FastAPI + Python (Render with Docker)
- **Engine**: MATLAB compiled to Linux executable
- **Encryption**: DNA-based chaotic algorithm (UNCHANGED)

## Prerequisites

**Local Development:**
- Python 3.10+
- Node.js 16+ (for frontend)
- MATLAB 2023b (for compilation only)

**Production Deployment:**
- Render account (backend hosting)
- Netlify account (frontend hosting)
- GitHub repository (version control)

## Setup

1.  **Install Python Dependencies**:
    ```bash
    cd backend
    pip install -r requirements.txt
    ```

2.  **Configure MATLAB**:
    - Ensure `matlab` command works in your terminal.
    - If you are running the `.m` files directly, no further setup is needed.
    - **Production Mode (Compiled Binary)**:
        - Open MATLAB.
        - Go to the `matlab/` directory.
        - Run: `mcc -m headless_runner.m`
        - This will create `headless_runner` (Linux) or `headless_runner.exe` (Windows).
        - In `backend/main.py`, update `USE_COMPILED_EXE = True` and point `COMPILED_EXEC_PATH` to your binary.

## usage

### Start the Server
```bash
cd backend
python main.py
```
Server runs at `http://localhost:8000`.

### API Endpoints

- **POST /encrypt**
    - `file`: Image file
    - `d_rounds`: DNA Rounds (default 4)
    - `p_rounds`: Protein Rounds (default 5)
    - `r_val`: Chaos parameter (default 3.99)
    - **Returns**: Encrypted PNG image. Key is returned in `X-Encryption-Key` header.

- **POST /decrypt**
    - `file`: Encrypted Image
    - `key`: The key string (e.g., `D4P5R3.99000000000000`)
    - **Returns**: Decrypted PNG image.

## Security Note
The MATLAB logic is isolated. The backend treats the MATLAB encryption engine as a black box, ensuring modularity and separation of concerns.
