import { useState } from 'react'

type Mode = 'encrypt' | 'decrypt'

interface EncryptionMetrics {
  entropy: number | null
  npcr: number | null
  uaci: number | null
}

function App() {
  const [mode, setMode] = useState<Mode>('encrypt')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [resultUrl, setResultUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  
  // Key parameters
  const [encryptionKey, setEncryptionKey] = useState('D4P5R3.99')
  const [decryptKey, setDecryptKey] = useState('')
  
  // Metrics
  const [metrics, setMetrics] = useState<EncryptionMetrics | null>(null)
  const [matlabOutput, setMatlabOutput] = useState('')

  // Get API base URL from environment or default to localhost
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file')
      return
    }
    
    setSelectedFile(file)
    setResultUrl('')
    setMetrics(null)
    setMatlabOutput('')
    
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
    if (!selectedFile) {
      alert('Please select an image first')
      return
    }

    if (!encryptionKey.match(/^D\d+P\d+R[\d.]+$/)) {
      alert('Invalid key format. Use D#P#R#.# (e.g., D4P5R3.99)')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('image', selectedFile)
      formData.append('key', encryptionKey)

      const response = await fetch(`${API_BASE_URL}/encrypt`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Encryption failed')
      }

      const data = await response.json()
      
      // Store metrics
      setMetrics(data.metrics)
      setMatlabOutput(data.matlab_output || '')
      
      // Download encrypted image
      const downloadUrl = `${API_BASE_URL}${data.download_url}`
      setResultUrl(downloadUrl)
      
      alert('✅ Encryption successful! Metrics calculated.')
    } catch (error: any) {
      console.error('Encryption error:', error)
      alert(`❌ Encryption failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDecrypt = async () => {
    if (!selectedFile) {
      alert('Please select an image first')
      return
    }

    if (!decryptKey.match(/^D\d+P\d+R[\d.]+$/)) {
      alert('Invalid key format. Use D#P#R#.# (e.g., D4P5R3.99)')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('image', selectedFile)
      formData.append('key', decryptKey)

      const response = await fetch(`${API_BASE_URL}/decrypt`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Decryption failed')
      }

      const data = await response.json()
      
      // Download decrypted image
      const downloadUrl = `${API_BASE_URL}${data.download_url}`
      setResultUrl(downloadUrl)
      
      alert('✅ Decryption successful!')
    } catch (error: any) {
      console.error('Decryption error:', error)
      alert(`❌ Decryption failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!resultUrl) return
    
    const link = document.createElement('a')
    link.href = resultUrl
    link.download = `${mode}ed_image.png`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const resetForm = () => {
    setSelectedFile(null)
    setPreviewUrl('')
    setResultUrl('')
    setMetrics(null)
    setMatlabOutput('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            🔐 Image Encryption Tool
          </h1>
          <p className="text-slate-400 mt-2">Chaos-based DNA & Logistic Map Encryption</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Mode Selector */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => { setMode('encrypt'); resetForm() }}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              mode === 'encrypt'
                ? 'bg-cyan-600 text-white shadow-lg'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            🔒 Encrypt
          </button>
          <button
            onClick={() => { setMode('decrypt'); resetForm() }}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              mode === 'decrypt'
                ? 'bg-cyan-600 text-white shadow-lg'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            🔓 Decrypt
          </button>
        </div>

        {/* File Upload Section */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 mb-8">
          <label
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
              dragActive
                ? 'border-cyan-400 bg-cyan-400/10'
                : 'border-slate-600 hover:border-slate-500'
            }`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="text-3xl mb-2">📸</div>
            <p className="text-white font-semibold">Drag image here or click to upload</p>
            <p className="text-slate-400 text-sm mt-1">PNG, JPG, GIF (max 10MB)</p>
          </label>
        </div>

        {/* Preview */}
        {previewUrl && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-8">
            <p className="text-slate-300 text-sm mb-3">Original Image</p>
            <img src={previewUrl} alt="Preview" className="w-full max-h-64 object-contain rounded" />
          </div>
        )}

        {/* Key Input */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-8">
          <label className="block text-slate-300 text-sm font-semibold mb-3">
            {mode === 'encrypt' ? '🔑 Encryption Key' : '🔑 Decryption Key'}
          </label>
          <input
            type="text"
            placeholder="D4P5R3.99"
            value={mode === 'encrypt' ? encryptionKey : decryptKey}
            onChange={(e) => {
              if (mode === 'encrypt') {
                setEncryptionKey(e.target.value)
              } else {
                setDecryptKey(e.target.value)
              }
            }}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <p className="text-slate-400 text-xs mt-2">Format: D#P#R#.# (e.g., D4P5R3.99)</p>
        </div>

        {/* Action Button */}
        <button
          onClick={mode === 'encrypt' ? handleEncrypt : handleDecrypt}
          disabled={!selectedFile || loading}
          className={`w-full py-3 rounded-lg font-bold text-white transition mb-8 ${
            loading || !selectedFile
              ? 'bg-slate-600 cursor-not-allowed opacity-50'
              : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500'
          }`}
        >
          {loading ? '⏳ Processing...' : `${mode === 'encrypt' ? '🔒' : '🔓'} ${mode.toUpperCase()}`}
        </button>

        {/* Metrics */}
        {metrics && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-8">
            <h3 className="text-white font-semibold mb-4">📊 Encryption Metrics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-700 rounded p-4">
                <p className="text-slate-400 text-sm">Entropy</p>
                <p className="text-cyan-400 text-xl font-bold">{metrics.entropy?.toFixed(3) || 'N/A'}</p>
              </div>
              <div className="bg-slate-700 rounded p-4">
                <p className="text-slate-400 text-sm">NPCR (%)</p>
                <p className="text-cyan-400 text-xl font-bold">{metrics.npcr?.toFixed(2) || 'N/A'}</p>
              </div>
              <div className="bg-slate-700 rounded p-4">
                <p className="text-slate-400 text-sm">UACI (%)</p>
                <p className="text-cyan-400 text-xl font-bold">{metrics.uaci?.toFixed(2) || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        {resultUrl && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-8">
            <p className="text-slate-300 text-sm mb-3">
              {mode === 'encrypt' ? '🔒 Encrypted Image' : '🔓 Decrypted Image'}
            </p>
            <button
              onClick={handleDownload}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3 rounded-lg transition"
            >
              ⬇️ Download Result
            </button>
          </div>
        )}

        {/* MATLAB Output (Debug) */}
        {matlabOutput && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <details className="cursor-pointer">
              <summary className="text-slate-300 font-semibold">🔍 MATLAB Debug Output</summary>
              <pre className="text-slate-400 text-xs mt-4 bg-slate-900 p-3 rounded overflow-auto max-h-64">
                {matlabOutput}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
