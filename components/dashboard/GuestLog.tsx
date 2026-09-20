import { Check, HelpCircle } from 'lucide-react'
import type { GuestEntry } from '@/lib/trail/guest-log'
import { euro, josa } from '@/lib/josa'

// 공개 등반지도에 놀러 온 사람이 남긴 답. 아무도 안 왔으면 섹션 자체를 그리지 않는다 —
// "아직 아무도 다녀가지 않았어요" 같은 빈 상태는 공유 링크를 켤 마음을 꺾는다.
// 무슨 일이 일어났을 때만 나타나는 게 맞다.

function relativeTime(iso: string, now: number): string {
  const diff = now - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function GuestLog({ entries }: { entries: GuestEntry[] }) {
  if (entries.length === 0) return null

  const now = Date.now()

  return (
    <section className="mb-10">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        다녀간 사람들
      </h3>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {entries.map((entry) => {
          // 이름은 안 남겨도 되는 칸이라(맞히기 창 안내 문구) 비어 있는 경우가 많다.
          // 이름이 없으면 '누군가' — "누군가님은"이 되지 않게 조사까지 같이 고른다.
          const subject = entry.guesserName
            ? `${entry.guesserName}님${entry.isCorrect ? '이' : '은'}`
            : '누군가'

          return (
            <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
              <span
                className={`mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full p-1 ${
                  entry.isCorrect ? 'bg-emerald-50 text-emerald-600' : 'bg-violet-50 text-violet-500'
                }`}
              >
                {entry.isCorrect ? <Check size={12} /> : <HelpCircle size={12} />}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900 leading-relaxed break-words">
                  {entry.isCorrect ? (
                    <>
                      {subject} 『{entry.bookTitle}』{josa(entry.bookTitle, '을', '를')} 맞혔어요
                    </>
                  ) : (
                    <>
                      {subject} 『{entry.bookTitle}』{josa(entry.bookTitle, '을', '를')}{' '}
                      <span className="text-gray-500">『{entry.guess}』</span>
                      {euro(entry.guess)} 봤어요
                    </>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{relativeTime(entry.createdAt, now)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
