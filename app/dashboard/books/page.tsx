import { redirect } from 'next/navigation'

// 구 산책기록 페이지. 홈(/dashboard)과 통합되어 더 이상 별도 페이지로 존재하지 않음.
// 기존 링크/북마크가 깨지지 않도록 홈으로 리다이렉트.
export default function BooksPage() {
  redirect('/dashboard')
}
