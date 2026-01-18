import os
import shutil
import subprocess
import uuid
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import logging

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DNA_Encryption")

app = FastAPI(title="DNA Chaos Encryption Backend")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Encryption-Key"]
)

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
PROCESSED_DIR = BASE_DIR / "processed"
MATLAB_DIR = BASE_DIR / "matlab"

# CONFIGURATION: Set this to True if using a compiled standalone executable
USE_COMPILED_EXE = False
MATLAB_EXEC_NAME = "matlab" # Or full path to matlab
COMPILED_EXEC_PATH = str(MATLAB_DIR / "headless_runner") # If compiled, e.g., ./headless_runner

# Create dirs
UPLOAD_DIR.mkdir(exist_ok=True)
PROCESSED_DIR.mkdir(exist_ok=True)

def run_matlab_process(mode, input_path, output_path, key_str):
    """
    Executes the MATLAB logic.
    If USE_COMPILED_EXE is True, calls the standalone executable.
    Else, calls MATLAB engine via -batch command.
    """
    input_str = str(input_path).replace("\\", "/") # MATLAB prefers forward slashes
    output_str = str(output_path).replace("\\", "/")
    
    if USE_COMPILED_EXE:
        # Expected signature: ./headless_runner mode input output key
        cmd = [COMPILED_EXEC_PATH, mode, input_str, output_str, key_str]
        cwd = None # Executables usually don't need specific CWD if paths are absolute
    else:
        # MATLAB -batch execution
        # Command: headless_runner('mode', 'in', 'out', 'key')
        cmd_str = f"headless_runner('{mode}', '{input_str}', '{output_str}', '{key_str}')"
        cmd = [MATLAB_EXEC_NAME, "-batch", cmd_str]
        cwd = MATLAB_DIR # Must be in dir to find .m file

    logger.info(f"Executing: {cmd}")
    
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True
        )
        logger.info(f"STDOUT: {result.stdout}")
        if result.stderr:
            logger.error(f"STDERR: {result.stderr}")
        return result
    except FileNotFoundError:
        logger.error(f"MATLAB executable '{cmd[0]}' not found.")
        return None

@app.on_event("startup")
async def startup_check():
    """
    Checks if MATLAB executable and required scripts exist.
    """
    logger.info("--- Performing Startup Checks ---")
    
    # 1. Check directories
    if not UPLOAD_DIR.exists(): logger.warning(f"Upload dir {UPLOAD_DIR} missing (will be created on use)")
    if not PROCESSED_DIR.exists(): logger.warning(f"Processed dir {PROCESSED_DIR} missing (will be created on use)")
    
    # 2. Check MATLAB Script presence
    if not USE_COMPILED_EXE:
        runner_script = MATLAB_DIR / "headless_runner.m"
        if not runner_script.exists():
            logger.critical(f"CRITICAL: MATLAB script not found at {runner_script}")
        else:
            logger.info(f"MATLAB script found: {runner_script}")

    # 3. Check Executable availability
    exe_check = COMPILED_EXEC_PATH if USE_COMPILED_EXE else MATLAB_EXEC_NAME
    if shutil.which(exe_check) is None:
        # If not in path, check if it's a specific absolute path
        if not Path(exe_check).exists():
             logger.warning(f"⚠️  MATLAB executable '{exe_check}' NOT FOUND in PATH or filesystem.")
             logger.warning("Please update 'MATLAB_EXEC_NAME' in main.py to the absolute path of your MATLAB installation.")
    else:
        logger.info(f"MATLAB executable '{exe_check}' found.")
    
    logger.info("--- Startup Checks Compliance ---")

@app.get("/")
def health_check():
    return {
        "status": "running",
        "matlab_integration": "configured" if shutil.which(MATLAB_EXEC_NAME) or Path(MATLAB_EXEC_NAME).exists() else "missing_executable"
    }


@app.post("/encrypt")
async def encrypt_image(
    file: UploadFile = File(...),
    d_rounds: int = Form(4),
    p_rounds: int = Form(5),
    r_val: float = Form(3.99)
):
    file_id = str(uuid.uuid4())
    # Always use .png for both input and output to ensure lossless processing
    input_path = UPLOAD_DIR / f"{file_id}.png"
    output_path = PROCESSED_DIR / f"{file_id}_enc.png"
    
    try:
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Construct Key
        key_str = f"D{d_rounds}P{p_rounds}R{r_val:.14f}"
        
        result = run_matlab_process('encrypt', input_path, output_path, key_str)
        
        if result is None:
             raise HTTPException(status_code=500, detail="MATLAB executable not found. Please configure the backend.")

        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"MATLAB Error: {result.stderr or result.stdout}")
            
        if not output_path.exists():
            raise HTTPException(status_code=500, detail=f"Output file not found. MATLAB Output: {result.stdout} Stderr: {result.stderr}")

        return FileResponse(
            output_path, 
            media_type="image/png", 
            filename=f"encrypted_{Path(file.filename).stem}.png",
            headers={
                "X-Encryption-Key": key_str,
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )

    except Exception as e:
        logger.exception("Encryption failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/decrypt")
async def decrypt_image(
    file: UploadFile = File(...),
    key: str = Form(...)
):
    file_id = str(uuid.uuid4())
    # Always use .png for lossless processing
    input_path = UPLOAD_DIR / f"{file_id}.png"
    output_path = PROCESSED_DIR / f"{file_id}_dec.png"
    
    try:
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        result = run_matlab_process('decrypt', input_path, output_path, key)
        
        if result is None:
             raise HTTPException(status_code=500, detail="MATLAB executable not found. Please configure the backend.")
        
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"MATLAB Error: {result.stderr or result.stdout}")
            
        if not output_path.exists():
            raise HTTPException(status_code=500, detail="Output file not found. Check MATLAB logs.")

        return FileResponse(
            output_path, 
            media_type="image/png", 
            filename=f"decrypted_{Path(file.filename).stem}.png",
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
        
    except Exception as e:
        logger.exception("Decryption failed")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("Starting Server...")
    print("Ensure 'matlab' is in your PATH or configure MATLAB_EXEC_NAME in main.py")
    uvicorn.run(app, host="0.0.0.0", port=8000)
