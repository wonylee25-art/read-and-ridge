# 등산 기록 기능

페이지: `/dashboard/hikes`

## 구성 컴포넌트

```
app/dashboard/hikes/page.tsx   (Server Component)
  └─ components/hikes/AddHikeForm.tsx   (Client)
```

---

## 등산 추가 (`AddHikeForm.tsx`)

### 폼 필드

| 필드 | 필수 | 타입 | 설명 |
|------|------|------|------|
| mountain | ✓ | text | 산 이름 |
| trail | - | text | 등산 코스 (예: 북한산 백운대코스) |
| date | ✓ | date | 등산 날짜 |
| distance_km | - | number | 총 거리 (km) |
| elevation_m | - | number | 최고 고도 (m) |
| duration_min | - | number | 소요 시간 (분) |
| memo | - | textarea | 메모 |

### 제출

`addHike(formData)` Server Action → Supabase insert → `revalidatePath('/dashboard/hikes')` 및 `/dashboard`

---

## 목록 페이지 (`hikes/page.tsx`)

### 요약 통계 바 (3칸 그리드)

| 통계 | 계산 방식 |
|------|---------|
| 총 거리 | `hikes.reduce((s, h) => s + (h.distance_km ?? 0), 0)` |
| 총 시간 | `hikes.reduce((s, h) => s + (h.duration_min ?? 0), 0)` → `formatDuration()` |
| 최고 고도 | `Math.max(...hikes.map((h) => h.elevation_m ?? 0))` |

### `formatDuration(min: number)` 유틸

```typescript
const h = Math.floor(min / 60)
const m = min % 60
return h > 0 ? `${h}시간 ${m > 0 ? m + '분' : ''}` : `${m}분`
```

### 등산 카드

날짜 내림차순 정렬. 각 카드에:
- 산 이름 + 코스 태그
- 날짜
- 거리 / 고도 / 시간 (입력된 항목만 표시)
- 메모 (있을 때만)
- 삭제 버튼 (`deleteHike(hike.id)` Server Action)

---

## 현재 미구현 / 개선 포인트

- 수정 기능 없음 → 삭제 후 재입력으로 수정
- 지도 연동 없음 → 산 이름을 Naver 지도 API와 연결하면 위치 정보 추가 가능
- 통계 확장 가능: 월별 집계, 누적 고도 등
