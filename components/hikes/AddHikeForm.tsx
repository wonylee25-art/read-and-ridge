'use client'

import { useState } from 'react'
import { addHike } from '@/app/dashboard/hikes/actions'
import { Plus, X } from 'lucide-react'

export default function AddHikeForm() {
  const [open, setOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await addHike(new FormData(e.currentTarget))
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-xl hover:bg-gray-700 transition-colors"
      >
        <Plus size={16} /> 등산 추가
      </button>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">완등기록 추가</h3>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">산 이름 *</label>
          <input
            name="mountain"
            required
            placeholder="한라산"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">코스</label>
          <input
            name="trail"
            placeholder="성판악 코스"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">날짜 *</label>
          <input
            name="date"
            type="date"
            required
            defaultValue={new Date().toISOString().split('T')[0]}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">거리 (km)</label>
          <input
            name="distance_km"
            type="number"
            step="0.1"
            min="0"
            placeholder="9.6"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">고도 (m)</label>
          <input
            name="elevation_m"
            type="number"
            min="0"
            placeholder="1950"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">소요 시간 (분)</label>
          <input
            name="duration_min"
            type="number"
            min="0"
            placeholder="300"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">메모</label>
          <textarea
            name="memo"
            rows={2}
            placeholder="날씨가 맑고 좋았다..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          />
        </div>

        <div className="col-span-2 flex justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            취소
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-xl hover:bg-gray-700 transition-colors"
          >
            저장
          </button>
        </div>
      </form>
    </div>
  )
}
