'use client'

// 맞춰보세요 산을 맞혔을 때, 드러난 제목을 그 방문자의 브라우저에만 남긴다.
//
// 왜 서버에 저장하지 않는가 — 한 사람이 맞혔다고 모두에게 이름표가 달리면 ① 뒤에 온
// 사람은 놀 게 없고 ② 주인이 '맞춰보세요'로 둔 의도가 첫 방문자 한 명에게 지워진다.
// 정답 여부 자체는 이미 `guesses` 테이블에 남아 주인에게 전달되므로, 화면에 남는
// 이름표는 "내가 맞혔다"는 각자의 기억으로 충분하다.
//
// 저장하는 값이 곧 정답이라 slug별로 분리해 둔다(다른 사람 지도에 섞이지 않게).
// localStorage를 못 쓰는 환경(프라이빗 모드·차단)에서도 화면은 그대로 동작해야 하므로
// 읽기·쓰기 모두 실패를 삼킨다 — 새로고침하면 다시 물음표가 될 뿐이다.
const PREFIX = 'sanchaek:revealed:'

export type RevealedTitles = Record<string, string>

export function loadRevealed(slug: string): RevealedTitles {
  try {
    const raw = localStorage.getItem(PREFIX + slug)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    // 값이 문자열인 칸만 살린다 — 손으로 고쳐 넣은 값이 화면에 그대로 그려지지 않게.
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string'
      )
    )
  } catch {
    return {}
  }
}

export function saveRevealed(slug: string, revealed: RevealedTitles): void {
  try {
    localStorage.setItem(PREFIX + slug, JSON.stringify(revealed))
  } catch {
    // 저장 못 해도 이번 화면에서는 이름표가 달려 있다. 그걸로 충분하다.
  }
}
