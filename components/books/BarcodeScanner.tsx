'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

type Props = {
  onDetected: (isbn: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<any>(null)
  const onDetectedRef = useRef(onDetected)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  useEffect(() => {
    let stopped = false

    async function start() {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader
        setScanning(true)

        await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (stopped) return
            if (result) {
              const text = result.getText()
              if (/^97[89]\d{10}$/.test(text)) {
                stopped = true
                onDetectedRef.current(text)
              }
            }
          }
        )
      } catch {
        setError('카메라 접근 권한이 필요해요.')
        setScanning(false)
      }
    }

    start()

    return () => {
      stopped = true
      readerRef.current?.reset?.()
    }
  }, [])

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.85)'
    }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 384, margin: '0 16px', background: '#000', borderRadius: 16, overflow: 'hidden' }}>

        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', padding: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <X size={18} />
        </button>

        <video
          ref={videoRef}
          style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }}
          autoPlay muted playsInline
        />

        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <style>{`
            @keyframes scanline {
              0%   { top: 10%; }
              50%  { top: 85%; }
              100% { top: 10%; }
            }
            .scan-line {
              position: absolute; left: 0; right: 0; height: 2px;
              background: #f87171;
              animation: scanline 1.8s ease-in-out infinite;
              box-shadow: 0 0 6px #f87171;
            }
          `}</style>
          <div style={{ position: 'relative', width: 256, height: 144, border: '2px solid rgba(255,255,255,0.7)', borderRadius: 8 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 24, height: 24, borderTop: '4px solid #fff', borderLeft: '4px solid #fff' }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: 24, height: 24, borderTop: '4px solid #fff', borderRight: '4px solid #fff' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: 24, height: 24, borderBottom: '4px solid #fff', borderLeft: '4px solid #fff' }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderBottom: '4px solid #fff', borderRight: '4px solid #fff' }} />
            {scanning && <div className="scan-line" />}
          </div>
          <p style={{ marginTop: 16, color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 500 }}>
            책 뒤 바코드를 박스 안에 맞춰주세요
          </p>
        </div>

        {error && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(127,29,29,0.85)', color: '#fff', fontSize: 14, padding: 16, textAlign: 'center' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
