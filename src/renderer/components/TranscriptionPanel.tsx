import { useCallback, useState } from 'react'

interface Props {
  text: string
  onSeek?: (time: number) => void
}

export default function TranscriptionPanel({ text, onSeek }: Props) {
  const parseTimestamp = (line: string): number | null => {
    const match = line.match(/\[(\d{2}):(\d{2}):(\d{2})\]/)
    if (match) {
      const [_, h, m, s] = match
      return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s)
    }
    return null
  }

  const lines = text.split('\n').filter(l => l.trim())

  return (
    <div className="space-y-4">
      {!text ? (
        <div className="flex flex-col items-center justify-center h-64 text-center space-y-md opacity-40 dark:text-slate-400">
          <span className="material-symbols-outlined text-[64px]">mic_none</span>
          <div>
            <p className="font-title-sm dark:text-slate-200">No transcription yet</p>
            <p className="font-body-sm text-secondary dark:text-slate-400">Upload an audio file and start recording to see results here.</p>
          </div>
        </div>
      ) : (
        lines.map((line, idx) => {
          const timestamp = parseTimestamp(line)
          const content = line.replace(/\[.*?\]/, '').trim()
          return (
            <div key={idx} className="flex gap-4 group animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-24 shrink-0 flex flex-col items-end">
                <button 
                  onClick={() => timestamp !== null && onSeek?.(timestamp)}
                  className={`font-mono text-[11px] px-2 py-0.5 rounded transition-colors ${
                    timestamp !== null 
                      ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 hover:bg-orange-500 dark:hover:bg-orange-500 hover:text-white dark:hover:text-white cursor-pointer' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {line.match(/\[(.*?)\]/)?.[1] || '00:00:00'}
                </button>
                <span className="font-label-caps text-[9px] text-slate-400 dark:text-slate-500 mt-1 uppercase font-bold">Speaker 1</span>
              </div>
              <div 
                onClick={() => timestamp !== null && onSeek?.(timestamp)}
                className="flex-1 bg-white dark:bg-slate-900 p-4 rounded-xl border border-outline-variant dark:border-slate-800 shadow-sm hover:border-orange-200 dark:hover:border-orange-500/30 hover:shadow-md dark:hover:shadow-orange-500/5 transition-all cursor-pointer"
              >
                <p className="font-body-md text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  {content}
                </p>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
