// 비로그인 상태의 진입 화면(산책기록)에 보여줄 예시 데이터.
// 실제 사용자 데이터가 아니라 서비스 소개용 샘플 — 여러 KDC 분야에 걸쳐
// 미시작/독서중 상태를 섞어서, "이게 뭐하는 서비스인지" 첫 화면만 보고도
// 감이 오도록 구성함.
// ⚠ 완등기록(hikes)은 비로그인이어도 로그인 유저가 0권일 때와 동일한 빈 상태
// 화면을 그대로 재사용하기로 해서(app/dashboard/hikes/page.tsx 참고), 가짜 완독
// 예시 데이터(DEMO_TROPHY_BOOKS)는 더 이상 쓰지 않아 삭제함.
import type { WorldMapBook } from '@/components/worldmap/worldmap-utils'

export const DEMO_HOME_BOOKS: WorldMapBook[] = [
  { id: 'demo-home-1', title: '압록강은 흐른다', total_pages: 240, current_page: 0, status: 'paused', kdc: '8', completed_at: null, memo: null, isbn: null },
  { id: 'demo-home-2', title: '망고와 수류탄', total_pages: 636, current_page: 320, status: 'reading', kdc: '9', completed_at: null, memo: null, isbn: null },
  { id: 'demo-home-3', title: '제자리에 있다는 것', total_pages: 320, current_page: 0, status: 'paused', kdc: '1', completed_at: null, memo: null, isbn: null },
  { id: 'demo-home-4', title: '랩걸', total_pages: 400, current_page: 0, status: 'paused', kdc: '5', completed_at: null, memo: null, isbn: null },
]
