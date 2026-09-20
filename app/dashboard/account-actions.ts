'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { generateShareSlug } from '@/lib/trail/slug'
import { getNicknameFromUser } from '@/lib/nickname'

// 닉네임 저장 — 원본은 계속 auth.users의 user_metadata에 둔다(앱 안의 모든 화면이
// lib/nickname.ts의 getNicknameFromUser로 거기서 읽는다).
//
// 2026.09 공개 지형도(/trail/[slug])가 생기면서 "남이 읽어야 하는 닉네임"이 처음
// 필요해졌다. 비로그인 방문자는 auth.users를 읽을 수 없으므로 profiles 테이블에
// 공개용 사본을 같이 써둔다. profiles.nickname은 미러이지 원본이 아니다 —
// 읽기는 공개 페이지에서만 하고, 앱 내부는 지금처럼 user_metadata를 본다.
export async function updateNickname(nickname: string) {
  const supabase = await createClient()
  const trimmed = nickname.trim()
  if (!trimmed) return { error: 'empty' as const }

  const { data, error } = await supabase.auth.updateUser({ data: { nickname: trimmed } })
  if (error) {
    console.error('updateNickname failed:', error.message)
    return { error: 'failed' as const }
  }

  // 공개용 미러 갱신. 실패해도 닉네임 저장 자체는 성공으로 본다 — 공개 페이지의
  // 이름이 잠깐 예전 값일 뿐이고, 여기서 막으면 본질(닉네임 변경)이 안 되기 때문.
  const userId = data.user?.id
  if (userId) {
    const { error: mirrorError } = await supabase
      .from('profiles')
      .upsert({ user_id: userId, nickname: trimmed }, { onConflict: 'user_id' })
    if (mirrorError) console.error('updateNickname: profiles 미러 실패:', mirrorError.message)
  }

  revalidatePath('/dashboard')
  return { error: null }
}

// 공개 지형도 링크 켜기/끄기.
//
// ⚠️ 끈다고 slug를 지우지 않는다. 전에는 지웠는데, 그러면 이미 뿌려둔 링크가 영영
// 죽고 다시 켤 때 새 주소가 나왔다. 토글을 끄는 상황은 대개 "영영 끊겠다"가 아니라
// "잠깐 내려두겠다"여서, 토글 한 번으로 되돌릴 수 없는 일이 벌어지는 셈이었다.
// 링크를 정말 버리는 건 별도 동작(regenerateShareSlug)으로만 일어난다.
//
// 그래서 **공개 여부는 slug의 존재가 아니라 share_enabled가 정한다.** 공개 페이지를
// 읽는 모든 경로(lib/trail/public-books.ts, app/trail/[slug]/guess-actions.ts)는
// 반드시 이 플래그를 같이 확인해야 한다 — 한 곳이라도 빠뜨리면 껐는데도 열린다.
// 기본값은 꺼짐이고, 켜는 건 항상 사용자의 명시적 행동이다.
export async function updateShareEnabled(enabled: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthenticated' as const, slug: null }

  const { data: existing } = await supabase
    .from('profiles')
    .select('share_slug')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!enabled) {
    const { error } = await supabase
      .from('profiles')
      .upsert({ user_id: user.id, share_enabled: false }, { onConflict: 'user_id' })
    if (error) {
      console.error('updateShareEnabled(off) failed:', error.message)
      return { error: 'failed' as const, slug: null }
    }
    revalidatePath('/dashboard')
    // 꺼진 동안에는 화면에 링크를 보여주지 않는다(slug 자체는 남아 있다)
    return { error: null, slug: null }
  }

  // 한 번 발급한 slug는 계속 같은 것을 쓴다 — 껐다 켜도 같은 링크로 돌아온다.
  const slug = (existing?.share_slug as string | null) ?? generateShareSlug()
  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: user.id,
      share_slug: slug,
      share_enabled: true,
      // 아직 미러가 없는 사용자를 대비해 닉네임도 같이 채워둔다
      nickname: getNicknameFromUser(user),
    },
    { onConflict: 'user_id' }
  )
  if (error) {
    console.error('updateShareEnabled(on) failed:', error.message)
    return { error: 'failed' as const, slug: null }
  }

  revalidatePath('/dashboard')
  return { error: null, slug }
}

// 링크 새로 만들기 — 되돌릴 수 없다. 지금 링크는 그 자리에서 죽고 새 주소가 나온다.
//
// 토글(잠깐 내려두기)과 의도가 다르다. 이쪽은 "이 링크가 엉뚱한 사람에게 흘러갔다"는
// 상황을 위한 것이라, 공개 상태는 건드리지 않고 주소만 갈아끼운다. 둘을 한 버튼에
// 겸하게 두면(예전처럼) 사용자에게는 되돌릴 수 있는 쪽으로만 보인다.
export async function regenerateShareSlug() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthenticated' as const, slug: null }

  const slug = generateShareSlug()
  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: user.id,
      share_slug: slug,
      share_enabled: true,
      nickname: getNicknameFromUser(user),
    },
    { onConflict: 'user_id' }
  )
  if (error) {
    console.error('regenerateShareSlug failed:', error.message)
    return { error: 'failed' as const, slug: null }
  }

  revalidatePath('/dashboard')
  return { error: null, slug }
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
