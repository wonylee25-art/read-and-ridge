import { redirect } from 'next/navigation'

// 진입 페이지 — 로그인 여부와 무관하게 항상 /dashboard로 보낸다.
// /dashboard 자체가 비로그인 상태면 예시 지형도(데모)를, 로그인 상태면 실제
// 데이터를 보여주도록 분기하므로, 여기서는 더 이상 로그인 여부를 확인할 필요가 없다.
export default function Home() {
  redirect('/dashboard')
}
