'use client'

import { useState, useCallback, useRef } from 'react'

interface UploadZoneProps {
  onSuccess: () => void
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export function UploadZone({ onSuccess }: UploadZoneProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [counts, setCounts] = useState<{ kpi: number; qa: number; summary: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setStatus('error')
      setMessage('Only .xlsx files are accepted.')
      return
    }

    setStatus('loading')
    setMessage('Uploading and processing…')
    setCounts(null)

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error ?? 'Upload failed')

      setStatus('success')
      setMessage('Dashboard updated successfully.')
      setCounts(json.counts)
      onSuccess()
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Upload failed')
    }
  }, [onSuccess])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) upload(file)
  }, [upload])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) upload(file)
  }

  const borderColor = dragging
    ? 'var(--brand)'
    : status === 'success'
    ? 'var(--green)'
    : status === 'error'
    ? 'var(--red)'
    : 'var(--border-strong)'

  return (
    <div style={{ maxWidth: 540, margin: '40px auto' }}>
      <div
        className="fade-in"
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${borderColor}`,
          borderRadius: 16,
          padding: '48px 32px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'var(--brand-light)' : 'var(--bg-surface)',
          transition: 'all 0.2s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />

        {status === 'loading' ? (
          <div>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Processing file…</p>
          </div>
        ) : status === 'success' ? (
          <div>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <p style={{ color: 'var(--green)', fontWeight: 600, marginBottom: 6 }}>{message}</p>
            {counts && (
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {counts.kpi} KPI months · {counts.qa} QA evaluations · {counts.summary} summaries
              </p>
            )}
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 12 }}>Click to upload another file</p>
          </div>
        ) : status === 'error' ? (
          <div>
            <div style={{ fontSize: 32, marginBottom: 12 }}>❌</div>
            <p style={{ color: 'var(--red)', fontWeight: 500, marginBottom: 8 }}>{message}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Click to try again</p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 40, marginBottom: 14, opacity: 0.5 }}>📂</div>
            <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 6, fontSize: 15 }}>
              Drop your quality.xlsx here
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              or click to browse
            </p>
            <div style={{
              display: 'inline-block',
              padding: '7px 18px',
              borderRadius: 8,
              border: '0.5px solid var(--border-strong)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              background: 'var(--bg-raised)',
            }}>
              Choose file
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 20, padding: '16px 20px', background: 'var(--bg-surface)', borderRadius: 12, border: '0.5px solid var(--border-default)' }}>
        <p className="label" style={{ marginBottom: 8 }}>Expected sheet structure</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            ['raw_data', 'Monthly KPI metrics — one row per month'],
            ['qa_data', 'Individual QA evaluations with CC / EC / BC scores'],
            ['qa_results', 'Monthly QA narrative strengths and improvements'],
          ].map(([name, desc]) => (
            <div key={name} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <code style={{
                fontSize: 11, fontFamily: 'var(--font-mono)',
                background: 'var(--bg-overlay)', color: 'var(--brand)',
                padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0,
              }}>{name}</code>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
