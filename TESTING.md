# Testing Guide - DNA Chaos Encryption

## Ensuring Perfect Encryption/Decryption

To verify that your decrypted image matches the original, follow these steps:

### 1. Start the Backend
```bash
cd backend
# Activate your virtual environment
.venv\Scripts\activate  # Windows
# or: source .venv/bin/activate  # Linux/Mac

# Start the server
uvicorn main:app --reload
```

### 2. Start the Frontend
```bash
cd frontend
npm run dev
```

### 3. Testing Process

#### Perfect Match Test:
1. **Choose a test image** (preferably PNG for best quality)
2. **Encrypt it** using any parameters (e.g., D=4, P=5, R=3.99)
3. **Save the encryption key** displayed (e.g., `D4P5R3.99000000000000`)
4. **Download the encrypted image**
5. **Upload the encrypted image** to decrypt
6. **Enter the exact same key** you saved
7. **Download the decrypted image**
8. **Compare** the decrypted image with your original

#### Important Notes:

**Image Format:**
- The system processes all images as **480x480 grayscale PNG**
- Original images are resized and converted to grayscale during encryption
- This is by design for the DNA encryption algorithm
- The decrypted image will be 480x480 grayscale, matching the encrypted version

**Why 480x480 Grayscale?**
- The MATLAB algorithm uses `TARGET_SIZE = 480` for processing
- Color images are converted to grayscale using standard luminance formula
- This ensures consistent encryption/decryption

**Testing Perfect Recovery:**
1. Encrypt an image
2. Decrypt the encrypted image with the correct key
3. The decrypted image should be **pixel-perfect identical** to the encrypted image's input (the 480x480 grayscale version)

### 4. Comparing Images

To verify pixel-perfect match, you can:

**Visual Inspection:**
- Both images should look identical when viewed

**Programmatic Verification (Python):**
```python
from PIL import Image
import numpy as np

# Read both images
encrypted_input = np.array(Image.open('encrypted.png'))
decrypted_output = np.array(Image.open('decrypted.png'))

# Check if identical
if np.array_equal(encrypted_input, decrypted_output):
    print("✓ Perfect match! Decryption is working correctly.")
else:
    diff = np.sum(encrypted_input != decrypted_output)
    print(f"✗ Mismatch! {diff} pixels differ.")
```

### 5. Troubleshooting

**If decryption doesn't match:**

1. **Verify the key is correct**
   - Make sure you copied the entire key including all decimal places
   - Format should be: `D#P#R#.##############`

2. **Check MATLAB is working**
   - Look at backend console logs
   - Ensure MATLAB executable is found
   - Check for MATLAB errors in the output

3. **Verify image format**
   - Both encrypted and decrypted should be PNG
   - Check file sizes are reasonable

4. **Backend logs**
   - Check terminal for any errors
   - Look for "MATLAB Error" messages

### Expected Behavior

**Encryption:**
- Input: Any image (JPG, PNG, etc.)
- Processing: Converts to 480x480 grayscale
- Output: Encrypted PNG (should look like random noise)

**Decryption:**
- Input: Encrypted PNG
- Processing: Reverses the encryption
- Output: Original 480x480 grayscale image (pixel-perfect match)

The decrypted image should match the **processed** original (480x480 grayscale), not necessarily your original full-color high-resolution image. This is expected behavior.
