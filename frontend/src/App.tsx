import { useState } from 'react'
import axios from 'axios'

type Mode = 'encrypt' | 'decrypt'

function App() {
  const [mode, setMode] = useState<Mode>('encrypt')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [resultUrl, setResultUrl] = useState<string>('')
  const [encryptionKey, setEncryptionKey] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  
  // Encryption parameters
  const [dRounds, setDRounds] = useState(4)
  const [pRounds, setPRounds] = useState(5)
  const [rVal, setRVal] = useState(3.99)
  
  // Decryption key
  const [decryptKey, setDecryptKey] = useState('')

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file')
      return
    }
    
    setSelectedFile(file)
    setResultUrl('')
    setEncryptionKey('')
    
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handleEncrypt = async () => {
    if (!selectedFile) return

    setLoading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('d_rounds', dRounds.toString())
    formData.append('p_rounds', pRounds.toString())
    formData.append('r_val', rVal.toString())

    try {
      const response = await axios.post('/encrypt', formData, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      const key = response.headers['x-encryption-key']
      if (key) {
        setEncryptionKey(key)
      }
      
      const url = URL.createObjectURL(response.data)
      setResultUrl(url)
    } catch (error: any) {
      console.error('Encryption failed:', error)
      const errorMsg = error.response?.data ? 
        await error.response.data.text() : 
        'Encryption failed. Please check that your backend is running.'
      alert(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleDecrypt = async () => {
    if (!selectedFile || !decryptKey) return

    setLoading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('key', decryptKey)

    try {
      const response = await axios.post('/decrypt', formData, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      const url = URL.createObjectURL(response.data)
      setResultUrl(url)
    } catch (error: any) {
      console.error('Decryption failed:', error)
      const errorMsg = error.response?.data ? 
        await error.response.data.text() : 
        'Decryption failed. Check your key and try again.'
      alert(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!resultUrl) return
    
    const link = document.createElement('a')
    link.href = resultUrl
    link.download = `${mode}ed_image.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const resetForm = () => {
    setSelectedFile(null)
    setPreviewUrl('')
    setResultUrl('')
    setEncryptionKey('')
    setDecryptKey('')
  }

  return (
    <div className="min-h-screen p-4 md:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-gradient">
            🧬 DNA Chaos Encryption
          </h1>
          <p className="text-gray-300 text-lg md:text-xl">
            Secure image encryption using DNA encoding and chaotic maps
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="glass-card p-2 inline-flex gap-2">
            <button
              onClick={() => { setMode('encrypt'); resetForm(); }}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                mode === 'encrypt'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              🔒 Encrypt
            </button>
            <button
              onClick={() => { setMode('decrypt'); resetForm(); }}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                mode === 'decrypt'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              🔓 Decrypt
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Panel - Input */}
          <div className="glass-card p-6 md:p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span>{mode === 'encrypt' ? '📤' : '📥'}</span>
              {mode === 'encrypt' ? 'Upload Image to Encrypt' : 'Upload Encrypted Image'}
            </h2>

            {/* File Upload Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`upload-zone ${dragActive ? 'upload-zone-active' : ''} p-8 mb-6 text-center`}
            >
              <input
                type="file"
                id="file-input"
                className="hidden"
                accept="image/*"
                onChange={handleFileInput}
              />
              <label htmlFor="file-input" className="cursor-pointer block">
                {previewUrl ? (
                  <div className="space-y-4">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-64 mx-auto rounded-lg shadow-lg"
                    />
                    <p className="text-sm text-gray-300">Click to change image</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-6xl animate-float">📸</div>
                    <div>
                      <p className="text-xl font-semibold mb-2">Drop your image here</p>
                      <p className="text-gray-400">or click to browse</p>
                    </div>
                  </div>
                )}
              </label>
            </div>

            {/* Parameters */}
            {mode === 'encrypt' ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-3">⚙️ Encryption Parameters</h3>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    DNA Rounds (D): {dRounds}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={dRounds}
                    onChange={(e) => setDRounds(parseInt(e.target.value))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1</span>
                    <span>10</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Permutation Rounds (P): {pRounds}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={pRounds}
                    onChange={(e) => setPRounds(parseInt(e.target.value))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1</span>
                    <span>10</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Chaos Parameter (R): {rVal.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="3.57"
                    max="4.0"
                    step="0.01"
                    value={rVal}
                    onChange={(e) => setRVal(parseFloat(e.target.value))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>3.57</span>
                    <span>4.00</span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-2">
                  🔑 Decryption Key
                </label>
                <input
                  type="text"
                  value={decryptKey}
                  onChange={(e) => setDecryptKey(e.target.value)}
                  placeholder="e.g., D4P5R3.99000000000000"
                  className="input-field w-full"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Enter the key you received during encryption
                </p>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={mode === 'encrypt' ? handleEncrypt : handleDecrypt}
              disabled={!selectedFile || loading || (mode === 'decrypt' && !decryptKey)}
              className="btn-primary w-full mt-6"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {mode === 'encrypt' ? '🔒 Encrypt Image' : '🔓 Decrypt Image'}
                </span>
              )}
            </button>
          </div>

          {/* Right Panel - Result */}
          <div className="glass-card p-6 md:p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span>✨</span>
              Result
            </h2>

            {resultUrl ? (
              <div className="space-y-6">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <img
                    src={resultUrl}
                    alt="Result"
                    className="max-w-full h-auto rounded-lg shadow-2xl mx-auto"
                  />
                </div>

                {encryptionKey && (
                  <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
                    <p className="text-sm font-semibold mb-2 text-purple-300">
                      🔑 Your Encryption Key
                    </p>
                    <div className="bg-black/30 rounded-lg p-3 font-mono text-sm break-all">
                      {encryptionKey}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      ⚠️ Save this key! You'll need it to decrypt your image.
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={handleDownload} className="btn-primary flex-1">
                    ⬇️ Download
                  </button>
                  <button onClick={resetForm} className="btn-secondary flex-1">
                    🔄 Reset
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-center">
                <div className="space-y-4">
                  <div className="text-6xl opacity-50 animate-float">
                    {mode === 'encrypt' ? '🔒' : '🔓'}
                  </div>
                  <p className="text-gray-400 text-lg">
                    {mode === 'encrypt' 
                      ? 'Your encrypted image will appear here'
                      : 'Your decrypted image will appear here'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <div className="glass-card p-6 inline-block">
            <p className="text-sm text-gray-300">
              🛡️ Powered by DNA Encoding & Chaotic Logistic Maps
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Your images are processed securely and never stored on our servers
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
