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
// 매달 1일에 그 달의 책을 한 권씩 고른다(`monthly-easter-egg-reminder` 알림 — docs/progress.md).
// 한 번 추가한 ISBN은 빼지 않는다 — 이미 그 책을 등록해 둔 사용자의 깃발 색이 바뀌어 버리기 때문.
export const AURORA_ISBNS: ReadonlySet<string> = new Set([
  '9788937450006', // 『세계문학전집 이야기』, 민음사
  '9788937492556', // 『래퍼와 공원』(땅 시리즈 3), 송재홍, 민음사 — 2026.08 선정
  '9788990247940', // 『호킹 주식회사』, 엘렌 미알레(김연화 옮김), 동녘사이언스 — 2026.09 선정
  // 2026.10 선정 — 『기계가 언어를 사용한다는 것에 대한 인문학적 사유』,
  // 마크 코켈버그·데이비드 J. 건컬(신동숙 옮김), 생각이음.
  // ⚠ 이 책은 서지 DB(국립중앙도서관 SEOJI)에 ISBN이 둘로 잡힌다 — 앱 검색창에도
  // 두 건이 나란히 뜨므로 사용자가 어느 쪽을 골라도 이스터에그가 걸리도록 둘 다 등록.
  '9791198740748', // 단행본(259쪽)
  '9791198740755', // 동일 도서의 다른 ISBN(전자책/세트 등 판형 구분)
])

function normalizeIsbn(isbn: string): string {
  return isbn.replace(/[-\s]/g, '')
}

export function isAuroraBook(isbn: string | null | undefined): boolean {
  if (!isbn) return false
  return AURORA_ISBNS.has(normalizeIsbn(isbn))
}
