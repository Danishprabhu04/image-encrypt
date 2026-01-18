# Use Python 3.11 slim image
FROM ubuntu:22.04

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    wget unzip ca-certificates curl gnupg \
    libx11-6 libxt6 libxmu6 libxrender1 libxi6 libglib2.0-0 \
    libxext6 libxinerama1 libxrandr2 libxss1 \
    python3.10 python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Download and install MATLAB Runtime (R2023b)
RUN mkdir -p /opt/matlab && \
    wget -q https://ssd.mathworks.com/supportfiles/downloads/R2023b/Release/7/deployment_files/installer/complete/glnxa64/MATLAB_Runtime_R2023b_Update_7_glnxa64.zip -O /tmp/matlab_runtime.zip && \
    unzip -q /tmp/matlab_runtime.zip -d /tmp/matlab_installer && \
    /tmp/matlab_installer/install -mode silent -agreeToLicense yes -destinationFolder /opt/matlab && \
    rm -rf /tmp/matlab_runtime.zip /tmp/matlab_installer

# Set MATLAB Runtime environment variables
ENV LD_LIBRARY_PATH=/opt/matlab/v233/runtime/glnxa64:/opt/matlab/v233/bin/glnxa64:/opt/matlab/v233/sys/os/glnxa64:$LD_LIBRARY_PATH
ENV XAPPLRESDIR=/opt/matlab/v233/X11/app-defaults

# Copy application and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
