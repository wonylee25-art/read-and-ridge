'use client'

import { X } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { 문구 } from '@/lib/copy'

export default function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">{문구.소개.제목}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <div className="text-sm text-gray-600 space-y-3 leading-relaxed">
          {문구.소개.본문.map((문단) => (
            <p key={문단}>{문단}</p>
          ))}

          <p className="pt-2 text-xs font-semibold text-gray-400 tracking-wide">
            {문구.소개.덧붙이는말_제목}
          </p>
          {문구.소개.덧붙이는말.map((문단) => (
            <p key={문단}>{문단}</p>
          ))}
        </div>
    </Modal>
  )
}
