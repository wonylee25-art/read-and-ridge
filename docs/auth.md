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
```

Supabase 대시보드 → Project Settings → API에서 확인.

Google OAuth 설정: Supabase 대시보드 → Authentication → Providers → Google에서 Client ID / Secret 입력 후 리다이렉트 URL 등록.
