export const runtime = 'nodejs'

// ⚠️ force-dynamic은 이 페이지의 정합성을 지키는 장치다. 지우지 말 것.
//
// Next 14에서 동적 세그먼트([slug])만으로는 동적 렌더가 되지 않는다. 이 페이지는
// cookies()/headers()를 쓰지 않으므로(일부러 서비스 롤로 읽는다) 아무 조건도 안 걸면
// **풀 라우트 캐시에 영구 저장**되고, supabase-js의 fetch도 정적 렌더 중엔
// force-cache로 캐시된다. 그러면 책을 비공개로 돌려도 방문자에게는 계속 보인다.
// 개인 규모 트래픽이라 캐시 이득보다 정합성이 훨씬 중요하다.
export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPublicTrail } from '@/lib/trail/public-books'
import { isValidShareSlug } from '@/lib/trail/slug'
import TrailClient from './TrailClient'

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isValidShareSlug(params.slug)) return { title: '산책또산책' }
  const trail = await getPublicTrail(params.slug)
  if (!trail) return { title: '산책또산책' }
  return {
    title: `${trail.nickname}님의 등반지도 · 산책또산책`,
    description: `${trail.nickname}님이 오른 산 ${trail.stats.completedCount}개를 구경해보세요.`,
    // 공개 링크이긴 하지만 검색엔진에 올라갈 성격은 아니다 — 링크를 받은 사람만 본다.
    robots: { index: false, follow: false },
  }
}

export default async function TrailPage({ params }: Props) {
  // 형태부터 거르고 DB에 간다 — 아무 문자열이나 쿼리로 흘리지 않기 위함
  if (!isValidShareSlug(params.slug)) notFound()

  const trail = await getPublicTrail(params.slug)
  if (!trail) notFound() // 공개 토글을 끄면(slug 삭제) 즉시 여기로 떨어진다

  return <TrailClient slug={params.slug} trail={trail} />
}
