// WorldMap 관련 타입 및 순수 유틸(서버에서도 호출 가능한 함수) 모음.
//
// ⚠️ 이 파일에는 'use client'를 붙이면 안 됩니다.
// WorldMap.tsx는 'use client' 컴포넌트라서, 거기서 export한 일반 함수(toWorldMapBooks 등)를
// Server Component(app/dashboard/page.tsx, app/dashboard/hikes/page.tsx)에서 직접 호출하면
// 개발 서버에서는 문제없이 동작하지만, 프로덕션 빌드(Vercel)에서는 RSC 클라이언트 경계 때문에
// 함수 참조가 제대로 전달되지 않아 "TypeError: X is not a function" 런타임 에러가 발생합니다.
// (2026.07.11, 실제 배포에서 발생 — dashboard 진입 시 서버 에러)
// 그래서 Server/Client 양쪽에서 공유해야 하는 타입·함수는 이 파일로 분리합니다.

export type WorldMapBook = {
  id: string
  title: string
  total_pages: number | null
  current_page: number
  status: 'reading' | 'completed' | 'paused'
  kdc?: string | null
  completed_at?: string | null // 완독 처리된 시각 (ISO). WorldMap 노출 유예(COMPLETION_GRACE_MS) 판단용
  memo?: string | null
}

// Supabase에서 받아온 books row 배열을 WorldMap이 필요로 하는 형태로 변환.
// dashboard/page.tsx와 dashboard/hikes/page.tsx가 동일한 매핑을 각자 갖고 있던 걸
// 여기로 통합 — books row 타입 전체를 import하지 않도록 필요한 필드만 구조적 타입으로 받음.
type BookRow = {
  id: string
  title: string
  total_pages: number | null
  current_page: number
  status: string
  kdc?: string | null
  completed_at?: string | null
  memo?: string | null
}

export function toWorldMapBooks(books: BookRow[] | null | undefined): WorldMapBook[] {
  return (books ?? []).map((b) => ({
    id: b.id,
    title: b.title,
    total_pages: b.total_pages,
    current_page: b.current_page,
    status: b.status as WorldMapBook['status'],
    kdc: b.kdc ?? null,
    completed_at: b.completed_at ?? null,
    memo: b.memo ?? null,
  }))
}

// 완등기록(trophy)에 보여줄 최근 완독 책 수 — 이 이상은 지도에서 잘라내고
// 아래 전체 목록(BookCard 그리드)에서만 확인 가능. 완독이 쌓일수록 지도가
// 무한정 길어지는 걸 막기 위함 (호출 측이 completed_at 내림차순으로 넘겨준다는 전제).
// hikes/page.tsx에서 안내 문구에 쓸 수 있도록 export.
export const TARGET_TROPHY = 5
