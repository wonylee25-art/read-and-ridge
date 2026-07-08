import { createClient } from '@supabase/supabase-js'

// ⚠️ 서버 전용 관리자 클라이언트 — SUPABASE_SERVICE_ROLE_KEY는 RLS를 완전히
// 우회하고 auth.users까지 직접 조작할 수 있는 매우 민감한 키다.
// 절대 'use client' 컴포넌트나 클라이언트로 전송되는 코드에서 import하면 안 되고,
// 오직 'use server' 액션/라우트 핸들러 안에서만 사용할 것. (.env.local에만 두고
// NEXT_PUBLIC_ 접두사를 붙이지 않아야 브라우저 번들에 노출되지 않는다.)
//
// 회원 탈퇴(계정 완전 삭제)처럼 auth.admin API가 필요한 경우에만 이 클라이언트를 쓴다.
// 일반적인 데이터 조회/쓰기는 반드시 lib/supabase/server.ts의 RLS 적용 클라이언트를 쓸 것.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. Supabase 프로젝트 설정 > API에서 ' +
        'service_role 키를 복사해 .env.local에 SUPABASE_SERVICE_ROLE_KEY로 추가해주세요.'
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
