from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import uuid
import os
import re
import tempfile
import logging

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Image Encryption API")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update to your Netlify domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Use temp directory for uploads
UPLOAD_DIR = tempfile.gettempdir()
MATLAB_EXECUTABLE = os.path.join(os.path.dirname(__file__), "..", "matlab", "run_headless_runner.sh")


@app.post("/encrypt")
async def encrypt_image(
    image: UploadFile = File(...),
    key: str = Form(...)
):
    """
    Encrypt an image using MATLAB headless_runner
    
    Args:
        image: PNG image file
        key: Encryption key in format D#P#R#.# (e.g., D4P5R3.99)
    
    Returns:
        Encrypted image metadata and download URL
    """
    try:
        # Generate unique ID for this session
        uid = str(uuid.uuid4())
        input_path = os.path.join(UPLOAD_DIR, f"{uid}_in.png")
        output_path = os.path.join(UPLOAD_DIR, f"{uid}_out.png")

        # Save uploaded image
        content = await image.read()
        with open(input_path, "wb") as f:
            f.write(content)
        
        logger.info(f"Processing: {uid} | Key: {key}")

        # Call MATLAB executable
        cmd = [
            MATLAB_EXECUTABLE,
            "encrypt",
            input_path,
            output_path,
            key
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120  # 2 minute timeout for MATLAB Runtime
        )

        if result.returncode != 0:
            logger.error(f"MATLAB Error: {result.stderr}")
            return JSONResponse(
                status_code=500,
                content={"error": f"Encryption failed: {result.stderr}"}
            )

        # Parse metrics from MATLAB output
        metrics = {
            "entropy": None,
            "npcr": None,
            "uaci": None
        }

        # Look for metrics in stdout
        if "Entropy:" in result.stdout:
            entropy_match = re.search(r"Entropy:\s*([\d.]+)", result.stdout)
            if entropy_match:
                metrics["entropy"] = float(entropy_match.group(1))

        if "NPCR:" in result.stdout:
            npcr_match = re.search(r"NPCR:\s*([\d.]+)%?", result.stdout)
            if npcr_match:
                metrics["npcr"] = float(npcr_match.group(1))

        if "UACI:" in result.stdout:
            uaci_match = re.search(r"UACI:\s*([\d.]+)%?", result.stdout)
            if uaci_match:
                metrics["uaci"] = float(uaci_match.group(1))

        # Check if output was created
        if not os.path.exists(output_path):
            return JSONResponse(
                status_code=500,
                content={"error": "Output file not generated"}
            )

        logger.info(f"Success: {uid} | Metrics: {metrics}")

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "session_id": uid,
                "metrics": metrics,
                "download_url": f"/download/{uid}",
                "matlab_output": result.stdout
            }
        )

    except subprocess.TimeoutExpired:
        logger.error("MATLAB execution timeout")
        return JSONResponse(
            status_code=504,
            content={"error": "Processing timeout - MATLAB Runtime took too long"}
        )
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.get("/download/{uid}")
async def download_encrypted(uid: str):
    """Download encrypted image"""
    try:
        file_path = os.path.join(UPLOAD_DIR, f"{uid}_out.png")
        
        if not os.path.exists(file_path):
            return JSONResponse(
                status_code=404,
                content={"error": "File not found"}
            )
        
        return FileResponse(
            file_path,
            media_type="image/png",
            filename=f"encrypted_{uid}.png"
        )
    except Exception as e:
        logger.error(f"Download error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.post("/decrypt")
async def decrypt_image(
    image: UploadFile = File(...),
    key: str = Form(...)
):
    """
    Decrypt an image using MATLAB headless_runner
    
    Args:
        image: Encrypted PNG image file
        key: Decryption key in format D#P#R#.# (e.g., D4P5R3.99)
    
    Returns:
        Decrypted image metadata and download URL
    """
    try:
        uid = str(uuid.uuid4())
        input_path = os.path.join(UPLOAD_DIR, f"{uid}_enc.png")
        output_path = os.path.join(UPLOAD_DIR, f"{uid}_dec.png")

        content = await image.read()
        with open(input_path, "wb") as f:
            f.write(content)
        
        logger.info(f"Decrypting: {uid} | Key: {key}")

        cmd = [
            MATLAB_EXECUTABLE,
            "decrypt",
            input_path,
            output_path,
            key
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120
        )

        if result.returncode != 0:
            logger.error(f"MATLAB Error: {result.stderr}")
            return JSONResponse(
                status_code=500,
                content={"error": f"Decryption failed: {result.stderr}"}
            )

        if not os.path.exists(output_path):
            return JSONResponse(
                status_code=500,
                content={"error": "Output file not generated"}
            )

        logger.info(f"Decryption success: {uid}")

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "session_id": uid,
                "download_url": f"/download_decrypted/{uid}"
            }
        )

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.get("/download_decrypted/{uid}")
async def download_decrypted(uid: str):
    """Download decrypted image"""
    try:
        file_path = os.path.join(UPLOAD_DIR, f"{uid}_dec.png")
        
        if not os.path.exists(file_path):
            return JSONResponse(
                status_code=404,
                content={"error": "File not found"}
            )
        
        return FileResponse(
            file_path,
            media_type="image/png",
            filename=f"decrypted_{uid}.png"
        )
    except Exception as e:
        logger.error(f"Download error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Image Encryption API"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
