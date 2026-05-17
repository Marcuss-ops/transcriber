import { contextBridge, ipcRenderer } from 'electron'

export interface HistoryEntry {
  id: number
  nome_file: string
  data_creazione: string
  durata_secondi: number
  testo: string
  note: string
}

contextBridge.exposeInMainWorld('electronAPI', {
  // Audio
  selectAudioFiles: () => ipcRenderer.invoke('select-audio-files'),
  readAudioFile: (filePath: string) => ipcRenderer.invoke('read-audio-file', filePath),
  transcribeFile: (args: { filePath: string; language: string }) => ipcRenderer.invoke('transcribe-file', args),
  onTranscriptionProgress: (callback: (p: number) => void) => {
    const subscription = (_event: any, p: number) => callback(p)
    ipcRenderer.on('transcription-progress', subscription)
    return () => ipcRenderer.removeListener('transcription-progress', subscription)
  },

  // Cronologia (SQLite)
  historySave: (entry: { nome_file: string; testo: string; durata_secondi?: number }) =>
    ipcRenderer.invoke('history-save', entry),
  historyGetAll: () => ipcRenderer.invoke('history-get-all') as Promise<HistoryEntry[]>,
  historyGetById: (id: number) => ipcRenderer.invoke('history-get-by-id', id) as Promise<HistoryEntry | null>,
  historySearch: (query: string) => ipcRenderer.invoke('history-search', query) as Promise<HistoryEntry[]>,
  historyDelete: (id: number) => ipcRenderer.invoke('history-delete', id) as Promise<boolean>,
  historyClear: () => ipcRenderer.invoke('history-clear') as Promise<boolean>,
  historyUpdateNotes: (id: number, note: string) => ipcRenderer.invoke('history-update-notes', id, note) as Promise<boolean>,
})
