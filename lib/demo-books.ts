// 비로그인 상태의 진입 화면(산책기록/완등기록)에 보여줄 예시 데이터.
// 실제 사용자 데이터가 아니라 서비스 소개용 샘플 — 여러 KDC 분야에 걸쳐
// 미시작/독서중/완독 상태를 섞어서, "이게 뭐하는 서비스인지" 첫 화면만 보고도
// 감이 오도록 구성함.
import type { WorldMapBook } from '@/components/worldmap/worldmap-utils'

export const DEMO_HOME_BOOKS: WorldMapBook[] = [
  { id: 'demo-home-1', title: '데미안', total_pages: 240, current_page: 0, status: 'paused', kdc: '8', completed_at: null, memo: null, isbn: null },
  { id: 'demo-home-2', title: '사피엔스', total_pages: 636, current_page: 320, status: 'reading', kdc: '9', completed_at: null, memo: null, isbn: null },
  { id: 'demo-home-3', title: '논어', total_pages: 320, current_page: 0, status: 'paused', kdc: '1', completed_at: null, memo: null, isbn: null },
  { id: 'demo-home-4', title: '침묵의 봄', total_pages: 400, current_page: 0, status: 'paused', kdc: '5', completed_at: null, memo: null, isbn: null },
]

export const DEMO_TROPHY_BOOKS: WorldMapBook[] = [
  { id: 'demo-trophy-1', title: '코스모스', total_pages: 720, current_page: 720, status: 'completed', kdc: '4', completed_at: '2026-05-01T00:00:00.000Z', memo: null, isbn: null },
  { id: 'demo-trophy-2', title: '어린 왕자', total_pages: 120, current_page: 120, status: 'completed', kdc: '8', completed_at: '2026-04-10T00:00:00.000Z', memo: null, isbn: null },
]
