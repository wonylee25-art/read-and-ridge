# 데이터베이스 (Supabase)

## books 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid (PK) | 자동 생성 |
| `user_id` | uuid (FK) | `auth.users.id` 참조 |
| `title` | text | 책 제목 |
| `author` | text \| null | 저자 |
| `total_pages` | int \| null | 전체 페이지 수 |
| `current_page` | int | 현재 읽은 페이지 (기본값 0) |
| `status` | text | `'reading'` \| `'completed'` \| `'paused'` |
| `started_at` | date \| null | 읽기 시작일 |
| `kdc` | text \| null | 한국십진분류 코드 (WorldMap 색상 테마용) |
| `completed_at` | timestamptz \| null | 완독 처리된 시각. WorldMap 24시간 유예(깃발 표시) 판단 + 완등기록 정렬/날짜 표시에 사용 |
| `created_at` | timestamptz | 자동 생성 |

### status 값

| 값 | 의미 | UI 표시 |
|----|------|---------|
| `reading` | 읽는 중 | 파란 뱃지, WorldMap 캐릭터 활성 |
| `completed` | 완독 | 초록 뱃지, WorldMap 정상석 표시 |
| `paused` | 잠시 멈춤 | 회색 뱃지, WorldMap 산 반투명 |

### kdc (한국십진분류) 매핑

WorldMap 산 색상 테마에 영향을 줌.

| kdc 첫 자리 | 분류 | 테마 |
|------------|------|------|
| 0, 1, 2 | 총류/철학/종교 | mystery (회청색) |
| 3, 7, 9 | 사회/예술/역사 | earth (황토색) |
| 4, 5 | 과학/기술 | nature (초록) |
| 6, 8 | 기술/문학 | fantasy (보라) |
| null | 미입력 | index 기반 순환 |

---

## hikes 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid (PK) | 자동 생성 |
| `user_id` | uuid (FK) | `auth.users.id` 참조 |
| `mountain` | text | 산 이름 (필수) |
| `trail` | text \| null | 등산 코스 |
| `date` | date | 등산 날짜 (필수) |
| `distance_km` | numeric \| null | 거리 (km) |
| `elevation_m` | int \| null | 최고 고도 (m) |
| `duration_min` | int \| null | 소요 시간 (분) |
| `memo` | text \| null | 메모 |
| `created_at` | timestamptz | 자동 생성 |

---

## RLS (Row Level Security)

두 테이블 모두 `user_id = auth.uid()` 조건으로 사용자 본인 데이터만 접근 가능하도록 RLS 설정 필요.

```sql
-- books RLS 예시
create policy "users can manage their own books"
  on books for all
  using (user_id = auth.uid());

-- hikes RLS 예시
create policy "users can manage their own hikes"
  on hikes for all
  using (user_id = auth.uid());
```

---

## Supabase 클라이언트

| 파일 | 용도 |
|------|------|
| `lib/supabase/client.ts` | Client Component에서 사용 (`createBrowserClient`) |
| `lib/supabase/server.ts` | Server Component / API Route에서 사용 (`createServerClient`) |

서버 클라이언트는 `cookies()`를 사용해 세션을 읽기 때문에 반드시 `async/await`로 호출해야 함.
