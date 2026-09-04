import { useRef, useState } from 'react'
import styles from './App.module.css'

const CONTROL_METHODS = ['ВИК', 'РК', 'ПВК']

function App() {
  const [file, setFile] = useState(null)
  const [controlMethod, setControlMethod] = useState('')
  const [isDragActive, setIsDragActive] = useState(false)
  const [status, setStatus] = useState('idle') // idle | generating | done | error
  const [errorMessage, setErrorMessage] = useState('')
  const [downloadId, setDownloadId] = useState(null)
  const fileInputRef = useRef(null)

  const chooseFile = (selectedFile) => {
    if (!selectedFile) return
    setFile(selectedFile)
    setStatus('idle')
    setDownloadId(null)
    setErrorMessage('')
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragActive(false)
    chooseFile(event.dataTransfer.files[0])
  }

  const handleGenerate = async () => {
    setStatus('generating')
    setErrorMessage('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('controlMethod', controlMethod)

    try {
      const res = await fetch('/api/generate', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setErrorMessage(data.error || 'Не удалось сгенерировать документы')
        return
      }

      setDownloadId(data.id)
      setStatus('done')
    } catch {
      setStatus('error')
      setErrorMessage('Не удалось связаться с сервером')
    }
  }

  const handleDownload = () => {
    window.location.href = `/api/download/${downloadId}`
  }

  const canGenerate = file && controlMethod && status !== 'generating'

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>qualWeldChit</h1>

      <div
        className={`${styles.dropZone} ${isDragActive ? styles.dropZoneActive : ''}`}
        onClick={() => fileInputRef.current.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragActive(true)
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={handleDrop}
      >
        {file ? (
          <div className={styles.fileName}>{file.name}</div>
        ) : (
          <div>Перетащите xlsx-файл сюда или нажмите, чтобы выбрать</div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          className={styles.hiddenInput}
          onChange={(e) => chooseFile(e.target.files[0])}
        />
      </div>

      <div className={styles.row}>
        <label htmlFor="controlMethod">Метод контроля</label>
        <select
          id="controlMethod"
          className={styles.select}
          value={controlMethod}
          onChange={(e) => setControlMethod(e.target.value)}
        >
          <option value="">-- выберите --</option>
          {CONTROL_METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
      </div>

      <button className={styles.button} disabled={!canGenerate} onClick={handleGenerate}>
        {status === 'generating' ? 'Генерация...' : 'Сгенерировать'}
      </button>

      {status === 'done' && (
        <button className={styles.buttonSecondary} onClick={handleDownload}>
          Скачать архив
        </button>
      )}

      {status === 'error' && <div className={styles.error}>{errorMessage}</div>}
    </div>
  )
}

export default App
