import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import Database from 'better-sqlite3'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
const ffprobePath = require('ffprobe-static').path

let transcribe: any
let addonError: string | null = null

const fixPath = (p: string) => {
  if (app.isPackaged && p) {
    return p.replace('app.asar', 'app.asar.unpacked')
  }
  return p
}

try {
  const whisperAddon = require('@kutalia/whisper-node-addon')
  transcribe = whisperAddon.transcribe
} catch (e: any) {
  addonError = e.message
  console.error('❌ CRITICAL: Failed to load @kutalia/whisper-node-addon.', e)
}

if (ffmpegPath) ffmpeg.setFfmpegPath(fixPath(ffmpegPath))
const rawFfprobePath = require('ffprobe-static').path
if (rawFfprobePath) ffmpeg.setFfprobePath(fixPath(rawFfprobePath))

let mainWindow: BrowserWindow | null = null
let db: Database.Database
let whisperEngine: any

// ============================
// Whisper Initialization
// ============================
function initWhisper() {
  if (!transcribe) {
    throw new Error(`Whisper Addon not loaded: ${addonError || 'Unknown error'}`)
  }
  
  const baseDir = app.isPackaged ? process.resourcesPath : process.cwd()
  let modelPath = path.join(baseDir, 'models', 'ggml-base.bin')
  
  if (!fs.existsSync(modelPath)) {
    modelPath = path.join(baseDir, 'models', 'ggml-tiny.bin')
  }
  
  if (!fs.existsSync(modelPath)) {
    throw new Error(`Model file not found at: ${modelPath}`)
  }

  whisperEngine = {
    transcribe: async (filePath: string, options: any) => {
      const result = await transcribe({
        model: modelPath,
        fname_inp: filePath,
        ...options
      })
      
      if (!result || !result.transcription) return []
      
      // Parse timestamp strings to milliseconds for backward compatibility
      // Format is usually [["00:00:00.000", "00:00:10.000", " text"]]
      return result.transcription.map((seg: any) => {
        if (Array.isArray(seg) && seg.length >= 3) {
          const parseTs = (ts: string) => {
            const parts = ts.split(':').map(parseFloat)
            if (parts.length === 3) {
              return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000
            }
            return 0
          }
          return {
            start: parseTs(seg[0]),
            end: parseTs(seg[1]),
            text: seg[2]
          }
        }
        return { start: 0, end: 0, text: String(seg) }
      })
    }
  }
  console.log('✅ Whisper engine initialized with model:', modelPath)
}

// ============================
// SQLite Database
// ============================
function initDatabase() {
  try {
    const appDataPath = process.env.APPDATA || path.join(process.env.HOME || '', '.local', 'share')
    const dbDir = path.join(appDataPath, 'TrascrizioneAudio')
    fs.mkdirSync(dbDir, { recursive: true })
    const dbPath = path.join(dbDir, 'dati_utente.db')

    db = new Database(dbPath)
    db.exec(`
      CREATE TABLE IF NOT EXISTS cronologia (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome_file TEXT NOT NULL,
        data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
        durata_secondi INTEGER DEFAULT 0,
        testo TEXT NOT NULL,
        note TEXT DEFAULT ''
      )
    `)
  } catch (e) {
    console.error('❌ Database init error:', e)
  }
}

// ============================
// Main Transcription Logic
// ============================
async function getDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) reject(err)
      else resolve(metadata.format.duration || 0)
    })
  })
}

async function processChunk(filePath: string, start: number, duration: number, index: number, language: string = 'it'): Promise<any[]> {
  const tempChunkPath = path.join(app.getPath('temp'), `chunk_${index}_${Date.now()}.wav`)
  try {
    await new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .setStartTime(start)
        .setDuration(duration)
        .outputOptions(['-ar 16000', '-ac 1', '-c:a pcm_s16le'])
        .save(tempChunkPath)
        .on('end', resolve)
        .on('error', reject)
    })

    if (!whisperEngine) throw new Error('Whisper engine crashed or not ready')
    
    const result = await whisperEngine.transcribe(tempChunkPath, {
      language: language,
      translate: false,
      use_gpu: false
    })

    if (fs.existsSync(tempChunkPath)) fs.unlinkSync(tempChunkPath)

    return result.map((s: any) => ({
      ...s,
      start: s.start + (start * 1000),
      end: s.end + (start * 1000)
    }))
  } catch (e) {
    if (fs.existsSync(tempChunkPath)) fs.unlinkSync(tempChunkPath)
    throw e
  }
}

ipcMain.handle('transcribe-file', async (event, { filePath, language = 'it' }: { filePath: string, language?: string }) => {
  try {
    if (!whisperEngine) initWhisper()
  } catch (e: any) {
    throw new Error(`Engine initialization failed: ${e.message}`)
  }

  try {
    const totalDuration = await getDuration(filePath)
    const numChunks = 5
    const chunkDuration = totalDuration / numChunks
    
    mainWindow?.webContents.send('transcription-progress', 5)

    const chunkResults = []
    for (let i = 0; i < numChunks; i++) {
      const progress = Math.floor(5 + (i / numChunks) * 90)
      mainWindow?.webContents.send('transcription-progress', progress)
      
      const chunkResult = await processChunk(filePath, i * chunkDuration, chunkDuration, i, language)
      chunkResults.push(chunkResult)
    }
    
    mainWindow?.webContents.send('transcription-progress', 100)

    const fullResult = chunkResults.flat().sort((a, b) => a.start - b.start)

    return fullResult.map((s: any) => {
      const start = Math.floor(s.start / 1000)
      const h = Math.floor(start / 3600).toString().padStart(2, '0')
      const m = Math.floor((start % 3600) / 60).toString().padStart(2, '0')
      const sec = (start % 60).toString().padStart(2, '0')
      return `[${h}:${m}:${sec}] ${s.text}`
    }).join('\n')
  } catch (e: any) {
    throw new Error(`Transcription failed: ${e.message}`)
  }
})

// ============================
// IPC Handlers
// ============================
ipcMain.handle('select-audio-files', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Media Files', extensions: ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'wma', 'mp4'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  return result.filePaths
})

ipcMain.handle('read-audio-file', async (_event, filePath: string) => {
  const stats = fs.statSync(filePath)
  const data = fs.readFileSync(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
    '.ogg': 'audio/ogg', '.flac': 'audio/flac', '.aac': 'audio/aac',
    '.wma': 'audio/x-ms-wma', '.mp4': 'video/mp4'
  }
  const mime = mimeTypes[ext] || 'audio/mpeg'
  const base64 = data.toString('base64')
  return { base64, mime, name: path.basename(filePath), size: stats.size, path: filePath }
})

ipcMain.handle('history-save', async (_event, entry: { nome_file: string; testo: string }) => {
  return db.prepare('INSERT INTO cronologia (nome_file, testo) VALUES (?, ?)').run(entry.nome_file, entry.testo).lastInsertRowid
})

ipcMain.handle('history-get-all', async () => {
  return db.prepare('SELECT * FROM cronologia ORDER BY data_creazione DESC').all()
})

ipcMain.handle('history-delete', async (_event, id: number) => {
  return db.prepare('DELETE FROM cronologia WHERE id = ?').run(id)
})

ipcMain.handle('history-search', async (_event, query: string) => {
  const like = `%${query}%`
  return db.prepare('SELECT * FROM cronologia WHERE testo LIKE ? OR nome_file LIKE ? ORDER BY data_creazione DESC').all(like, like)
})

// ============================
// App Lifecycle
// ============================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      preload: path.join(__dirname, '../dist-electron/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#ffffff',
    show: false,
  })

  if (process.env.VITE_DEV_SERVER_URL) mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  else mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))

  mainWindow.once('ready-to-show', () => mainWindow?.show())
}

app.whenReady().then(() => {
  initDatabase()
  try {
    initWhisper()
  } catch (e) {
    console.error('Initial Whisper boot failed (deferred to first run):', e)
  }
  createWindow()
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('before-quit', () => { if (db) db.close() })
