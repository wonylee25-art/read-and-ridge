# 인증 (Auth)

Supabase Auth + Google OAuth 2.0.

---

## 흐름

```
/login
  └─ 구글 로그인 버튼 클릭
       └─ supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/auth/callback' })
            └─ Google OAuth 동의 화면
                 └─ /auth/callback (route.ts)
                      └─ supabase.auth.exchangeCodeForSession(code)
                           └─ /dashboard 리다이렉트
```

---

## 파일별 역할

### `app/login/page.tsx`

- Client Component
- `useSearchParams()`로 `?error=` 파라미터 감지 (콜백 오류 시 표시)
- 로그인 버튼: `supabase.auth.signInWithOAuth()`

### `app/auth/callback/route.ts`

- GET Route Handler
- URL에서 `code` 파라미터 추출 → `exchangeCodeForSession(code)` 호출
- 성공: `/dashboard`로 리다이렉트
- 실패: `/login?error=...`로 리다이렉트

### `components/auth/LogoutButton.tsx`

- 사이드바 하단에 위치
- `supabase.auth.signOut()` → `/login`으로 이동

### `components/dashboard/DeleteAccountModal.tsx` + `app/dashboard/account-actions.ts` (2026.07.08 추가)

- 사이드바 하단 "회원 탈퇴" 버튼 → 확인 모달("탈퇴합니다" 입력 필요) → `deleteAccount()` 서버 액션
- `deleteAccount()`가 하는 일: (1) `books`/레거시 `hikes` 행 삭제 (2) `signOut()` (3) `lib/supabase/admin.ts`의 서비스 롤 클라이언트로 `auth.admin.deleteUser()` 호출해 Supabase Auth 계정 자체를 완전 삭제
- 이동 처리는 `LogoutButton`과 동일하게 클라이언트에서 `router.push('/login')` — 서버 액션 안에서 `redirect()`를 쓰면 실패 시 에러를 보여주는 try/catch가 그 특수 예외까지 삼켜버릴 수 있어 일부러 피함

---

## Supabase 클라이언트

### `lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'
// 브라우저(Client Component)에서 사용
```

### `lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
// Server Component, Route Handler, Server Action에서 사용
// cookies()로 세션 쿠키 읽기/쓰기
```

---

## 세션 관리

- Supabase SSR 패키지(`@supabase/ssr`)가 쿠키 기반 세션을 자동 처리
- 서버 컴포넌트에서 `supabase.auth.getUser()` 호출로 현재 유저 확인
- 인증되지 않은 사용자가 `/dashboard/*` 접근 시 → Supabase 미들웨어 또는 페이지 레벨에서 리다이렉트 처리 필요 (현재 페이지별로 `user!.id` 강제 접근 중 — 미들웨어 추가 권장)

---

## 환경변수

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # 회원 탈퇴(계정 완전 삭제)에만 사용, 매우 민감한 키
```

Supabase 대시보드 → Project Settings → API에서 확인. `SUPABASE_SERVICE_ROLE_KEY`(service_role
키)는 RLS를 완전히 우회하고 auth.users를 직접 조작할 수 있으므로 `NEXT_PUBLIC_` 접두사를
붙이면 안 되고(브라우저에 노출됨), `lib/supabase/admin.ts`처럼 서버 전용 코드에서만 써야 함.
로컬 `.env.local`뿐 아니라 **Vercel 배포 환경변수에도 동일하게 추가해야** 배포본에서 회원 탈퇴가
정상 동작함.

Google OAuth 설정: Supabase 대시보드 → Authentication → Providers → Google에서 Client ID / Secret 입력 후 리다이렉트 URL 등록.
