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
    global: {
      // ⚠️ Next.js는 서버에서 호출되는 fetch를 가로채 응답을 캐시한다. supabase-js는
      // 전역 fetch를 그대로 쓰기 때문에, 이걸 안 막으면 관리자 조회 결과가 캐시에
      // 얼어붙는다. 실제로 공개 지형도(/trail/[slug])에서 책을 비공개로 바꿔도
      // 방문자에게 계속 보이는 문제가 여기서 나왔다 — 페이지에 force-dynamic을
      // 걸어도 fetch 캐시는 별개라 안 풀렸다. (2026.09.19 실측)
      // 관리자 클라이언트의 조회는 어떤 경우에도 캐시되면 안 되므로 여기서 못 박는다.
      fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    },
  })
}
