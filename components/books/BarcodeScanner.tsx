'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Keyboard } from 'lucide-react'
import type { IScannerControls } from '@zxing/browser'

type Props = {
  onDetected: (isbn: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const onDetectedRef = useRef(onDetected)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [manualValue, setManualValue] = useState('')
  const [manualError, setManualError] = useState<string | null>(null)

  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  function submitManual(e: React.FormEvent) {
    e.preventDefault()
    const digits = manualValue.replace(/[^0-9]/g, '')
    if (!/^97[89]\d{10}$/.test(digits)) {
      setManualError('ISBN은 978 또는 979로 시작하는 13자리 숫자예요.')
      return
    }
    onDetectedRef.current(digits)
  }

  useEffect(() => {
    let stopped = false

    async function start() {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const { BarcodeFormat, DecodeHintType } = await import('@zxing/library')

        // 기본값은 프레임 중앙 부근 15줄만 스캔하고 회전도 시도하지 않아서
        // 책 바코드(EAN-13)처럼 작은 1D 바코드는 잘 못 잡는다.
        // TRY_HARDER + 대상 포맷 지정으로 전체 높이를 스캔하고 회전도 시도하게 한다.
        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
        ])
        hints.set(DecodeHintType.TRY_HARDER, true)

        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 150,
          delayBetweenScanSuccess: 500,
        })
        setScanning(true)

        const onResult = (result: { getText: () => string } | undefined) => {
          if (stopped) return
          if (result) {
            const text = result.getText()
            if (/^97[89]\d{10}$/.test(text)) {
              stopped = true
              onDetectedRef.current(text)
            }
          }
        }

        // 후면 카메라 + 고해상도로 요청 (기본 facingMode만 지정하면 저해상도/저초점
        // 스트림이 잡혀서 바코드가 흐릿하게 나오는 경우가 많다). ideal 값이라 미지원
        // 기기에서도 실패하지 않고 가능한 값으로 자동 조정된다.
        let controls: IScannerControls
        try {
          controls = await reader.decodeFromConstraints(
            {
              video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
              },
            },
            videoRef.current!,
            onResult
          )
        } catch {
          // 위 제약 조건을 지원하지 않는 브라우저를 위한 폴백
          controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, onResult)
        }
        controlsRef.current = controls
      } catch {
        setError('카메라 접근 권한이 필요해요.')
        setScanning(false)
      }
    }

    start()

    return () => {
      stopped = true
      controlsRef.current?.stop()
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

        {/* 표지 디자인 때문에 스캔이 잘 안 잡히는 바코드를 위한 수동 입력 */}
        {!error && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.55)', padding: manualMode ? 14 : 10 }}>
            {!manualMode ? (
              <button
                type="button"
                onClick={() => { setManualMode(true); setManualError(null) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: 13, cursor: 'pointer', padding: 4 }}
              >
                <Keyboard size={14} />
                바코드가 안 잡히면 직접 입력하기
              </button>
            ) : (
              <form onSubmit={submitManual} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    autoFocus
                    inputMode="numeric"
                    value={manualValue}
                    onChange={(e) => { setManualValue(e.target.value); setManualError(null) }}
                    placeholder="ISBN 13자리 (예: 9791160943030)"
                    style={{ flex: 1, minWidth: 0, borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '8px 10px', fontSize: 14 }}
                  />
                  <button
                    type="submit"
                    style={{ flexShrink: 0, borderRadius: 8, border: 'none', background: '#fff', color: '#111', fontSize: 14, fontWeight: 600, padding: '8px 14px', cursor: 'pointer' }}
                  >
                    확인
                  </button>
                </div>
                {manualError && (
                  <p style={{ margin: 0, color: '#fca5a5', fontSize: 12 }}>{manualError}</p>
                )}
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
