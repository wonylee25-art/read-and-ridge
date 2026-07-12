'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// 닉네임 저장 — 별도 profiles 테이블 없이 auth.users의 user_metadata에 저장한다.
// 다른 유저에게 보여줄 일이 없는 "본인 전용" 값(인사말, 나중에 캡처 워터마크)이라
// RLS·새 테이블 없이 supabase.auth.updateUser()로 충분함. 나중에 다른 유저에게도
// 닉네임을 보여주는 소셜 기능이 생기면 그때 profiles 테이블로 옮기면 됨.
export async function updateNickname(nickname: string) {
  const supabase = await createClient()
  const trimmed = nickname.trim()
  if (!trimmed) return { error: 'empty' as const }

  const { error } = await supabase.auth.updateUser({ data: { nickname: trimmed } })
  if (error) {
    console.error('updateNickname failed:', error.message)
    return { error: 'failed' as const }
  }

  revalidatePath('/dashboard')
  return { error: null }
}

// 회원 탈퇴 — 이용자 데이터(books)를 전부 지우고, Supabase Auth
// 계정 자체도 완전히 삭제한다(재로그인 시 새 계정으로 취급됨). 개인정보처리방침/
// 이용약관의 "탈퇴 시 지체 없이 파기" 문구를 실제로 이행하는 기능.
//
// ⚠ 일부러 이 안에서 redirect()를 호출하지 않음 — Server Action에서 redirect()는
// 특수 예외를 던지는 방식으로 동작하는데, 호출부(DeleteAccountModal)에서 실패 시
// try/catch로 에러 메시지를 보여줘야 해서 그 특수 예외까지 같이 삼켜버릴 위험이 있음.
// 그래서 로그아웃 버튼과 동일하게, 성공 후 이동은 클라이언트에서 router.push로 처리.
export async function deleteAccount() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인 상태가 아닙니다.')
  }

  const userId = user.id

  // 1. 이용자가 등록한 데이터 삭제. RLS(user_id = auth.uid())가 적용된 일반
  // 클라이언트로 지우기 때문에, 본인 데이터만 지워지는 게 이중으로 보장됨.
  await supabase.from('books').delete().eq('user_id', userId)

  // 2. 세션 종료
  await supabase.auth.signOut()

  // 3. Auth 계정 자체를 완전히 삭제 — RLS로는 불가능하고 서비스 롤 키로만 가능.
  // SUPABASE_SERVICE_ROLE_KEY가 없으면 createAdminClient()가 에러를 던진다.
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) {
    console.error('deleteAccount: auth.admin.deleteUser failed:', error.message)
    throw new Error('계정 삭제 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.')
  }
}
