import { useState, useCallback, useRef, useEffect } from 'react'
import AudioUploader, { AudioUploaderRef } from './components/AudioUploader'
import TranscriptionPanel from './components/TranscriptionPanel'
import { AudioFile } from './types'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { saveAs } from 'file-saver'

interface HistoryEntry {
  id: number
  nome_file: string
  data_creazione: string
  durata_secondi: number
  testo: string
  note: string
}

export default function App() {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [transcriptions, setTranscriptions] = useState<Record<string, string>>({})
  const [isTranscripting, setIsTranscripting] = useState(false)
  const [transcriptionProgress, setTranscriptionProgress] = useState(0)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historySearch, setHistorySearch] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  // Custom theme and Find & Replace states
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  
  const audioUploaderRef = useRef<AudioUploaderRef>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  const selectedFile = audioFiles.find(f => f.id === selectedFileId) || (audioFiles.length > 0 ? audioFiles[0] : null)
  const currentTranscription = selectedFileId ? transcriptions[selectedFileId] || '' : ''

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.historyGetAll().then(setHistory)
      const unsubscribe = window.electronAPI.onTranscriptionProgress(setTranscriptionProgress)
      return () => unsubscribe()
    } else {
      console.error('Electron API not found in window.')
    }
  }, [])

  // Sync dark mode style with document element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault()
        audioUploaderRef.current?.togglePlay()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (window.electronAPI) {
      if (historySearch.trim()) {
        window.electronAPI.historySearch(historySearch).then(setHistory)
      } else {
        window.electronAPI.historyGetAll().then(setHistory)
      }
    }
  }, [historySearch])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAddAudio = useCallback(async () => {
    if (!window.electronAPI) {
      alert('Application error: System bridge unavailable.')
      return
    }
    try {
      const paths = await window.electronAPI.selectAudioFiles()
      if (!paths || paths.length === 0) return

      const newFiles: AudioFile[] = []
      for (const filePath of paths) {
        const { base64, mime, name, size } = await window.electronAPI.readAudioFile(filePath)
        newFiles.push({ id: crypto.randomUUID(), name, url: `data:${mime};base64,${base64}`, size, path: filePath })
      }
      setAudioFiles((prev) => {
        const updated = [...prev, ...newFiles]
        return updated
      })
      if (newFiles.length > 0) {
        setSelectedFileId(newFiles[0].id)
      }
    } catch (error: any) {
      console.error('Add Media Error:', error)
      alert(`Error selecting files: ${error.message}`)
    }
  }, [])

  const handleFilesAdded = useCallback((newFiles: AudioFile[]) => {
    setAudioFiles((prev) => [...prev, ...newFiles])
    if (newFiles.length > 0) {
      setSelectedFileId(newFiles[0].id)
    }
  }, [])

  const handleRemoveAudio = useCallback((id: string) => {
    setAudioFiles((prev) => prev.filter((f) => f.id !== id))
    setTranscriptions((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    if (selectedFileId === id) setSelectedFileId(null)
  }, [selectedFileId])

  const saveToHistory = useCallback(async (testo: string, filename: string) => {
    if (window.electronAPI && testo.trim()) {
      await window.electronAPI.historySave({ nome_file: filename, testo: testo })
      const updatedHistory = await window.electronAPI.historyGetAll()
      setHistory(updatedHistory)
    }
  }, [])

  const handleStartTranscription = useCallback(async () => {
    if (!selectedFileId || !selectedFile || !selectedFile.path) {
        alert("Select a valid local file from the Library first.")
        return
    }
    setIsTranscripting(true)
    setTranscriptionProgress(0)
    try {
      const result = await window.electronAPI.transcribeFile({ 
        filePath: selectedFile.path, 
        language: 'it' 
      })
      setTranscriptions(prev => ({ ...prev, [selectedFileId]: result }))
      await saveToHistory(result, selectedFile.name)
    } catch (error: any) {
      console.error('Transcription error:', error)
      alert(`Transcription failed: ${error.message}`)
    } finally {
      setIsTranscripting(false)
      setTranscriptionProgress(100)
    }
  }, [selectedFile, selectedFileId, saveToHistory])

  const handleExport = useCallback(async (format: 'txt' | 'srt' | 'docx') => {
    if (!currentTranscription) return
    setShowExportMenu(false)
    const filename = `trascrizione_${selectedFile?.name || 'export'}.${format}`

    if (format === 'docx') {
      const doc = new Document({
        sections: [{
          properties: {},
          children: currentTranscription.split('\n').map(line => 
            new Paragraph({ children: [new TextRun(line)] })
          ),
        }],
      })
      const blob = await Packer.toBlob(doc)
      saveAs(blob, filename)
      return
    }

    let content = currentTranscription
    if (format === 'srt') {
      content = currentTranscription.split('\n').filter(l => l.includes('[')).map((line, i) => {
        const time = line.match(/\[(.*?)\]/)?.[1] || '00:00:00'
        const text = line.replace(/\[.*?\]/, '').trim()
        return `${i + 1}\n${time},000 --> ${time},999\n${text}\n`
      }).join('\n')
    }

    const blob = new Blob([content], { type: 'text/plain' })
    saveAs(blob, filename)
  }, [currentTranscription, selectedFile])

  const handleCopy = useCallback(() => {
    if (!currentTranscription) return
    const cleanText = currentTranscription.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/gm, '')
    navigator.clipboard.writeText(cleanText)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }, [currentTranscription])

  // Global search and replace handler with SQLite syncing
  const handleReplaceAll = useCallback(async (findText: string, replaceText: string) => {
    if (!selectedFileId || !selectedFile || !currentTranscription) return
    
    const escapedFind = findText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    const regex = new RegExp(escapedFind, 'g')
    const updated = currentTranscription.replace(regex, replaceText)
    
    setTranscriptions(prev => ({
      ...prev,
      [selectedFileId]: updated
    }))
    
    // Also save to SQLite history database
    await saveToHistory(updated, selectedFile.name)
  }, [selectedFileId, selectedFile, currentTranscription, saveToHistory])

  return (
    <main className="w-full h-full bg-white dark:bg-slate-950 overflow-hidden flex flex-col transition-colors duration-300">
      {/* Top App Bar */}
      <header className="bg-surface-bright dark:bg-slate-900 flex justify-between items-center h-16 px-md w-full border-b border-outline-variant dark:border-slate-800 relative transition-colors">
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all z-30 font-bold ${
            showHistory 
              ? 'bg-orange-500 text-white shadow-md' 
              : 'hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">history</span>
          <span className="font-label-caps uppercase text-[10px] tracking-widest">History</span>
        </button>

        <div className="absolute left-1/2 -translate-x-1/2">
          <span className="font-display-lg text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter text-center block">
            Transcribe<span className="text-orange-500">Pro</span>
          </span>
        </div>

        <div className="flex items-center gap-4 z-30">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center justify-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all active:scale-95"
            title="Toggle Theme"
          >
            <span className="material-symbols-outlined text-[20px]">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          
          <div className="flex items-center gap-xs">
            <div className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-800"></div>
            <button onClick={() => window.close?.()} className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 transition-colors shadow-sm"></button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* History Overlay */}
        {showHistory && (
          <aside className="absolute inset-y-0 left-0 w-96 bg-white dark:bg-slate-950 border-r border-outline-variant dark:border-slate-800 z-40 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <header className="p-6 border-b border-outline-variant dark:border-slate-800 flex flex-col gap-4 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Transcription History</h3>
                <button onClick={() => setShowHistory(false)} className="material-symbols-outlined text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">close</button>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                <input 
                  type="text" 
                  placeholder="Search transcriptions..." 
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                />
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-slate-950 custom-scrollbar">
              {history.length === 0 && <p className="text-center text-slate-400 dark:text-slate-500 font-body-sm mt-12 italic opacity-60">No matching sessions found</p>}
              {history.map(entry => (
                <div key={entry.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-orange-200 dark:hover:border-orange-500/30 hover:shadow-lg cursor-pointer group transition-all" onClick={() => {
                  const newId = `hist-${entry.id}`
                  setAudioFiles(prev => [...prev.filter(f => f.id !== newId), { id: newId, name: entry.nome_file, url: '', size: 0 }])
                  setTranscriptions(prev => ({ ...prev, [newId]: entry.testo }))
                  setSelectedFileId(newId)
                  setShowHistory(false)
                }}>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate mb-1">{entry.nome_file}</p>
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{new Date(entry.data_creazione).toLocaleString()}</p>
                    <button onClick={async (e) => { 
                      e.stopPropagation()
                      if (window.electronAPI) {
                        await window.electronAPI.historyDelete(entry.id)
                        setHistory(prev => prev.filter(h => h.id !== entry.id))
                      }
                    }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 dark:hover:bg-red-950/40 rounded text-red-400 hover:text-red-600">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}

        <aside className="w-96 border-r border-outline-variant dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 flex flex-col">
          <div className="p-6 flex flex-col h-full space-y-6">
            <AudioUploader
              ref={audioUploaderRef}
              files={audioFiles}
              selectedFileId={selectedFileId}
              onSelect={setSelectedFileId}
              onAdd={handleAddAudio}
              onFilesAdded={handleFilesAdded}
              onRemove={handleRemoveAudio}
              isTranscripting={isTranscripting}
              onStartTranscription={handleStartTranscription}
              onStopTranscription={() => setIsTranscripting(false)}
              playbackSpeed={playbackSpeed}
              onSpeedChange={setPlaybackSpeed}
            />
          </div>
        </aside>

        <section className="flex-1 flex flex-col bg-white dark:bg-slate-950">
          <header className="h-16 px-6 flex items-center justify-between border-b border-outline-variant dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-slate-400 dark:text-slate-500">description</span>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-sm">
                {selectedFile ? selectedFile.name : 'Seleziona un file per iniziare'}
              </h2>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={handleStartTranscription}
                disabled={!selectedFileId || isTranscripting}
                className={`flex items-center gap-2 px-8 py-2.5 rounded-full font-black text-white transition-all shadow-lg active:scale-95 ${
                  isTranscripting 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-red-200 dark:shadow-none' 
                    : 'bg-orange-500 hover:bg-orange-600 hover:shadow-orange-200 dark:hover:shadow-none disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:shadow-none dark:disabled:text-slate-650'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] font-bold">{isTranscripting ? 'sync' : 'play_circle'}</span>
                {isTranscripting ? `ELABORAZIONE ${transcriptionProgress}%` : 'AVVIA TRASCRIZIONE'}
              </button>

              <button onClick={() => selectedFileId && setTranscriptions(prev => ({ ...prev, [selectedFileId]: '' }))} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-all" title="Clear Text">
                <span className="material-symbols-outlined">delete</span>
              </button>
              
              <div className="relative" ref={exportMenuRef}>
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)} 
                  disabled={!currentTranscription}
                  className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-lg font-bold text-xs hover:bg-orange-600 active:scale-95 transition-all shadow-md hover:shadow-orange-200 dark:hover:shadow-none disabled:bg-slate-200 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 disabled:shadow-none"
                >
                  <span className="material-symbols-outlined text-[18px]">ios_share</span>
                  Esporta
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-outline-variant dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    <button onClick={() => handleExport('txt')} className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors">
                      <span className="material-symbols-outlined text-slate-400">text_snippet</span> .TXT (Con Timestamp)
                    </button>
                    <button onClick={() => handleExport('srt')} className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors">
                      <span className="material-symbols-outlined text-slate-400">subtitles</span> .SRT (Sottotitoli)
                    </button>
                    <button onClick={() => handleExport('docx')} className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors">
                      <span className="material-symbols-outlined text-slate-400">description</span> .DOCX (Microsoft Word)
                    </button>
                  </div>
                )}
              </div>

              <button 
                onClick={handleCopy} 
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-xs active:scale-95 transition-all shadow-md ${
                  isCopied 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-900 dark:hover:bg-slate-650'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isCopied ? 'check' : 'content_copy'}
                </span> 
                {isCopied ? 'Copiato!' : 'Copia'}
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 dark:bg-slate-950/20 custom-scrollbar">
            {isTranscripting && (
              <div className="mb-8 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-orange-100 dark:border-orange-950/40 shadow-xl animate-in fade-in zoom-in duration-300">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full animate-ping"></span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-widest">Processing Audio Streams...</span>
                  </div>
                  <span className="font-black text-orange-600 dark:text-orange-400 text-sm">{transcriptionProgress}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden shadow-inner p-0.5">
                  <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-full rounded-full transition-all duration-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]" style={{ width: `${transcriptionProgress}%` }} />
                </div>
                <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500 font-medium text-center italic">Processing chunks sequentially for maximum Native Whisper stability</p>
              </div>
            )}

            {/* Find & Replace Drawer Bar */}
            {currentTranscription && (
              <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between flex-wrap gap-4 shadow-sm animate-in slide-in-from-top duration-200">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-500 text-sm font-bold">find_replace</span>
                  <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300 uppercase tracking-wider">Cerca & Sostituisci</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <input 
                    type="text" 
                    placeholder="Trova parola..." 
                    value={findText} 
                    onChange={(e) => setFindText(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 w-44"
                  />
                  <input 
                    type="text" 
                    placeholder="Sostituisci con..." 
                    value={replaceText} 
                    onChange={(e) => setReplaceText(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 w-44"
                  />
                  <button 
                    onClick={() => {
                      handleReplaceAll(findText, replaceText)
                      setFindText('')
                      setReplaceText('')
                    }}
                    disabled={!findText}
                    className="px-4 py-1.5 bg-orange-500 text-white rounded-lg font-bold text-xs hover:bg-orange-600 active:scale-95 transition-all shadow-md disabled:bg-slate-200 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 disabled:shadow-none"
                  >
                    Sostituisci Tutto
                  </button>
                </div>
              </div>
            )}

            <TranscriptionPanel text={currentTranscription} onSeek={(time) => audioUploaderRef.current?.seekTo(time)} />
          </div>

          <footer className="h-12 px-6 bg-white dark:bg-slate-900 border-t border-outline-variant dark:border-slate-800 flex items-center justify-between font-bold text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">
            <div className="flex gap-8">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isTranscripting ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></span>
                <span>{isTranscripting ? 'Engine: Active' : 'Engine: Ready'}</span>
              </div>
              <span>Whisper Native C++</span>
            </div>
            <div className="flex gap-6 items-center">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800">
                <span className="material-symbols-outlined text-xs">language</span>
                <span>Italian Language Default</span>
              </div>
              <span>v1.2.0-ULTIMATE</span>
            </div>
          </footer>
        </section>
      </div>
    </main>
  )
}
