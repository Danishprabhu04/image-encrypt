@echo off
REM MATLAB Compilation Script for Windows
REM This script generates the Linux executable for headless_runner.m

echo.
echo ========================================
echo MATLAB Compiler - Image Encryption Tool
echo ========================================
echo.

REM Check if MATLAB is available
where matlab >nul 2>nul
if errorlevel 1 (
    echo ERROR: MATLAB is not installed or not in PATH
    echo Please install MATLAB with Compiler Toolbox
    pause
    exit /b 1
)

REM Change to matlab directory
cd /d "%~dp0matlab" || exit /b 1

echo Compiling headless_runner.m...
echo.

REM Run MATLAB Compiler
mcc -m headless_runner.m -o headless_runner -d output

if errorlevel 1 (
    echo.
    echo ERROR: Compilation failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Compilation Successful!
echo ========================================
echo.
echo Generated files:
echo   - output/headless_runner (Linux executable)
echo   - output/run_headless_runner.sh (Shell wrapper)
echo.
echo Next steps:
echo   1. Copy the generated files to matlab/
echo   2. Commit to GitHub
echo   3. Deploy to Render
echo.
pause
