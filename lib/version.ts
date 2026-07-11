import pkg from '@/package.json'

// 화면(사이드바 등)에 노출되는 앱 버전. package.json의 버전을 그대로 따라감.
export const APP_VERSION = pkg.version

// 마지막 배포 반영 날짜 — 배포(push)할 때마다 수동으로 갱신할 것.
// (CHANGELOG.md에 무엇이 바뀌었는지 같이 기록)
export const LAST_UPDATED = '2026-07-11'
