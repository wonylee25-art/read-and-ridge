// 오로라 이스터에그 — 개발자가 지정한 특정 책을 사용자가 갤러리에 추가하면
// 숨겨진 오로라 연출(AuroraOverlay)이 10초간 재생되고, 그 책의 정상 깃발도
// 평범한 6색 팔레트 대신 초록-보라 오로라 팔레트로 고정된다.
//
// 판별 기준: ISBN. 검색/스캔으로 추가된 책은 거의 항상 ISBN이 채워지므로
// (`app/dashboard/books/actions.ts`의 `addBook`), 특정 "그 책"을 정확히 지목하기엔
// 제목보다 ISBN이 안전함(동명이서·번역서 오탐 방지). ISBN이 하이픈 유무 등으로
// 다르게 들어올 수 있어 비교 전에 하이픈/공백을 제거해 정규화한다.
//
// 여기에 이스터에그를 걸고 싶은 책의 ISBN을 추가하면 됨 (13자리 또는 10자리 모두 가능).
export const AURORA_ISBNS: ReadonlySet<string> = new Set([
  '9788937450006', // 『세계문학전집 이야기』, 민음사
])

function normalizeIsbn(isbn: string): string {
  return isbn.replace(/[-\s]/g, '')
}

export function isAuroraBook(isbn: string | null | undefined): boolean {
  if (!isbn) return false
  return AURORA_ISBNS.has(normalizeIsbn(isbn))
}
