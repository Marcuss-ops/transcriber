export interface HistoryEntry {
  id: number
  nome_file: string
  data_creazione: string
  durata_secondi: number
  testo: string
  note: string
}

export interface ElectronAPI {
  // Audio & Transcription
  selectAudioFiles: () => Promise<string[]>
  readAudioFile: (filePath: string) => Promise<{ base64: string; mime: string; name: string; size: number; path: string }>
  transcribeFile: (args: { filePath: string; language: string }) => Promise<string>
  onTranscriptionProgress: (callback: (p: number) => void) => () => void

  // Cronologia (SQLite)
  historySave: (entry: { nome_file: string; testo: string; durata_secondi?: number }) => Promise<number>
  historyGetAll: () => Promise<HistoryEntry[]>
  historyGetById: (id: number) => Promise<HistoryEntry | null>
  historySearch: (query: string) => Promise<HistoryEntry[]>
  historyDelete: (id: number) => Promise<boolean>
  historyClear: () => Promise<boolean>
  historyUpdateNotes: (id: number, note: string) => Promise<boolean>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
    close: () => void
  }
}
