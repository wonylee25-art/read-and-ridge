# 닉네임 & 인사말

산책기록(`/dashboard`)에서만 노출되는 기능. `docs/features/viral-capture.md`의 "닉네임
설정 미구현" 블로커를 해소하기 위해 만들어짐 — 지금 당장은 인사말에만 쓰이고,
나중에 바이럴 캡처 워터마크(`[ Read & Ridge | Climber. 닉네임 ]`)에도 그대로
재사용할 수 있도록 데이터를 준비해두는 목적도 겸함.

---

## 저장 위치

별도 `profiles` 테이블 없이 `auth.users`의 `user_metadata.nickname`에 저장한다
(`supabase.auth.updateUser({ data: { nickname } })`). 다른 유저에게 보여줄 일이
없는 "본인 전용" 값(인사말, 캡처 워터마크)이라 RLS·마이그레이션이 필요 없는 이
방식으로 충분하다고 판단함.

> 나중에 다른 유저의 닉네임도 보여주는 소셜 기능(친구 비교, 리더보드 등)이 생기면
> 그때 `profiles` 테이블로 옮기는 게 맞다 — 지금은 과설계하지 않음.

## 기본값 (`app/dashboard/page.tsx`)

우선순위: `user_metadata.nickname`(직접 설정) → `user_metadata.full_name`(구글
프로필 이름, OAuth 시 자동으로 채워짐) → `user_metadata.name` → `'산책자'`(최후
기본값). 대부분의 유저는 별도 설정 없이도 구글 이름으로 바로 인사말이 뜬다.

## UI

`components/dashboard/Greeting.tsx` — `WorldMapClient.tsx`에서 `AddBookBar`
바로 위, 책 추가 버튼과 같은 오른쪽 정렬로 렌더링. `authenticated && nickname`일
때만 표시(완등기록 페이지에는 `nickname` prop을 안 넘겨서 자연스럽게 숨겨짐).

편집은 `BookCard.tsx`의 제목/저자 인라인 수정과 동일한 패턴 — 연필 아이콘 클릭 →
입력창 + 저장/취소. 별도 모달 없음.

## 인사말 문구 (시간대별)

`WorldMap`의 하늘 시간대 구간(`design-style.md` 기준)과 동일한 경계를 사용해
앱 안의 시간 감각과 어긋나지 않게 함:

| 시간대 | 문구 |
|--------|------|
| 새벽 0~6시 | "{닉네임}님, 이 새벽에도 와주셨네요" |
| 주간 6~16시 | "{닉네임}님, 안녕하세요" |
| 황혼 16~19시 | "{닉네임}님, 노을이 예뻐요" |
| 야간 19~24시 | "{닉네임}님, 오늘 하루도 고생하셨어요" |

브라우저 로컬 시각 기준, 페이지 마운트 시점에 1회만 계산(실시간 갱신 타이머 없음
— WorldMap 하늘과 달리 텍스트라 분 단위 정확도가 중요하지 않음).

## 서버 액션

`app/dashboard/account-actions.ts`의 `updateNickname(nickname: string)`.
빈 문자열은 저장하지 않고 `{ error: 'empty' }` 반환. 성공 시 `/dashboard`
`revalidatePath`.
