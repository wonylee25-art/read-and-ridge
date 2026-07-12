# 산책자 증표 (프로필)

산책기록(`/dashboard`)·완등기록(`/dashboard/hikes`) 양쪽 레이아웃 상단에 공통으로
표시. 두 페이지의 데이터(내가 산 책/발걸음 수, 완등기록/완등거리)를 함께 보여줘야
해서, 어느 한 페이지에 묶지 않고 `app/dashboard/layout.tsx`에서 렌더링한다.
`docs/features/nickname.md`의 후속 — 인라인 연필 편집 대신 팝업으로 통합했다.

---

## 트리거 (`components/dashboard/ProfileTrigger.tsx`)

오른쪽 상단에 "{닉네임}님, 반가워요" + 사람 아이콘 버튼. 아이콘 클릭 시 `ProfileModal` 오픈.
시간대별 인사말은 폐기하고 고정 문구로 단순화(이전 버전의 새벽/주간/황혼/야간 분기는
`Greeting.tsx`에 있었으나 이 컴포넌트로 대체되며 사용 중단).

## 팝업 (`components/dashboard/ProfileModal.tsx`)

`components/ui/Modal.tsx` 공용 셸 재사용. 구성:

1. **닉네임** — 입력창 + 저장 버튼. `updateNickname()` 서버 액션 호출(`docs/features/nickname.md` 참고)
2. **산책 시작일** — `user.created_at`
3. **최근 산책일** — `books.status_changed_at` 중 최댓값
4. **통계 카드 4개** (`StatCard.tsx` 재사용, 기존 페이지와 동일 아이콘/색) — 내가 산 책, 발걸음 수, 완등기록, 완등거리

## 데이터 소스 (`app/dashboard/layout.tsx`)

레이아웃 레벨에서 `books` 테이블을 가볍게 한 번 더 조회(`status, current_page, total_pages, status_changed_at`만 select)해 4개 통계 + 최근 산책일을 계산한다. `app/dashboard/page.tsx`·`app/dashboard/hikes/page.tsx`가 각자의 목록 렌더링을 위해 이미 하는 조회와는 별개 — 약간의 중복 쿼리지만 레이아웃과 페이지 컴포넌트를 서로 얽지 않기 위해 의도적으로 분리.

완등거리 환산 비율(`DISTANCE_PER_PAGE_M`)은 `components/worldmap/worldmap-utils.ts`로 공유 이동(기존엔 `hikes/page.tsx`에만 있었음) — 프로필 팝업과 완등기록 페이지의 거리 숫자가 어긋나지 않게.

### ⚠️ `status_changed_at` 의미 확장 (2026.07.12)

기존엔 책 추가·상태 변경(읽는 중→완독 등) 시에만 갱신됐음. "최근 산책일"이 정확하려면
단순 페이지 저장(`updateProgress`, 상태 변화 없이 페이지만 업데이트하는 경우)에도 이
값이 갱신돼야 해서, `app/dashboard/books/actions.ts`의 `updateProgress()`가 이제 매
호출마다 `status_changed_at`을 갱신하도록 확장함. 부수 효과: 산책기록의 "읽는 중/잠시
멈춤" 목록 정렬(이 필드 기준 최신순)도 더 정확해짐 — 상태를 안 바꾸고 페이지만 갱신해도
목록 맨 위로 올라옴.

---

## 명칭 변경 이력

"프로필"이라는 이름이 딱딱하다는 피드백으로 "산책자 증표"로 확정(2026.07.12). 실제
등산 문화의 "정상 인증" 뉘앙스와도 맞닿아 있어 `docs/features/viral-capture.md`의
정상 인증샷 컨셉과도 결이 통일됨.
