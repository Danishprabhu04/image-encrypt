#!/bin/bash
# MATLAB Compilation Script for macOS/Linux
# This script generates the Linux executable for headless_runner.m

echo "========================================"
echo "MATLAB Compiler - Image Encryption Tool"
echo "========================================"
echo ""

# Check if MATLAB is available
if ! command -v matlab &> /dev/null; then
    echo "ERROR: MATLAB is not installed or not in PATH"
    echo "Please install MATLAB with Compiler Toolbox"
    exit 1
fi

# Change to matlab directory
cd "$(dirname "$0")" || exit 1

echo "Compiling headless_runner.m..."
echo ""

# Run MATLAB Compiler
mcc -m headless_runner.m -o headless_runner -d output

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Compilation failed!"
    exit 1
fi

echo ""
echo "========================================"
echo "Compilation Successful!"
echo "========================================"
echo ""
echo "Generated files:"
echo "   - output/headless_runner (Linux executable)"
echo "   - output/run_headless_runner.sh (Shell wrapper)"
echo ""
echo "Next steps:"
echo "   1. Copy the generated files to matlab/"
echo "   2. Commit to GitHub"
echo "   3. Deploy to Render"
echo ""
