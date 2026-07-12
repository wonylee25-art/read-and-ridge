// 닉네임 우선순위: 직접 설정(user_metadata.nickname) > 구글 프로필 이름(full_name,
// OAuth 시 자동으로 채워짐) > name > 최후 기본값 '산책자'.
//
// app/dashboard/layout.tsx("산책자 증표" 트리거), app/dashboard/page.tsx·hikes/page.tsx
// (WorldMap PNG 캡처 워터마크)가 전부 이 로직을 공유해야, 같은 사용자인데 화면마다
// 다른 이름이 뜨는 일이 없다. Supabase User 타입 전체를 import하지 않도록 필요한
// user_metadata 필드만 구조적 타입으로 받는다.
type UserLike = { user_metadata?: Record<string, unknown> | null } | null | undefined

export function getNicknameFromUser(user: UserLike): string {
  if (!user) return '산책자'
  return (
    (user.user_metadata?.nickname as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    '산책자'
  )
}
