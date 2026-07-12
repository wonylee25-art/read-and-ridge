'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// books 관련 액션은 항상 이 세 경로를 함께 갱신해야 함(캐시된 목록이
// 산책기록/완등기록 양쪽 다 최신화되도록). 여러 함수에서 반복되던 3줄을 추출.
function revalidateBookPaths() {
  revalidatePath('/dashboard/books')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/hikes')
}

export async function addBook(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const isbn = formData.get('isbn') as string || null
  // 체크박스는 체크됐을 때만 폼에 값이 실려온다 ('on') — 없으면 소장 안 함
  const owned = formData.get('owned') === 'on'
  const title = ((formData.get('title') as string) || '').trim()
  const author = ((formData.get('author') as string) || '').trim() || null
  // /api/books/search가 KDC(정본) 우선, 없으면 SUBJECT(대분류)로 채워서 보냄.
  // 둘 다 없거나 직접 입력한 책이면 빈 문자열 → null로 저장, WorldMap이 book.id
  // 해시 순환으로 색을 배정한다.
  const kdc = ((formData.get('kdc') as string) || '').trim() || null

  // 중복 방지: 같은 책이 이미 등록돼 있으면 경고 팝업을 띄우고 등록을 막는다.
  // ⚠ 예전엔 "ISBN이 있고 + 소장 중(owned)"일 때만 검사해서, ISBN 없이 검색/직접
  // 입력한 책이나 owned=false(빌린 책)로 등록할 땐 같은 책이 그냥 중복 등록됐음
  // (읽는 중 진행률이 서로 다른 두 행이 생겨 목록이 헷갈리는 원인).
  // ISBN이 있으면 ISBN으로 바로 판단(ISBN이 같으면 무조건 같은 책).
  // ISBN이 없으면 제목(대소문자·공백 무시)으로 후보를 뽑되, 제목만 같고 저자가
  // 다른 "동명이서"를 오탐하지 않도록 저자까지 함께 비교한다 — 둘 다 저자 정보가
  // 있을 때만 저자 일치를 요구하고, 어느 한쪽이라도 저자가 비어 있으면 정보 부족을
  // 감안해 제목만으로 중복 판단(안전하게 막는 쪽을 택함).
  // owned 여부/상태(읽는 중·완독·잠시 멈춤)와 무관하게 같은 사용자의 기존 책과 겹치면 막음.
  let existing: { id: string; title: string } | null = null

  // ⚠ limit(1)을 꼭 붙임: 이미 예전 버그로 같은 제목/ISBN이 2건 이상 등록된
  // 계정이 있으면, limit 없이 maybeSingle()만 쓸 경우 "여러 행 반환" 에러가 남.
  if (isbn) {
    const { data } = await supabase
      .from('books')
      .select('id, title')
      .eq('user_id', user.id)
      .eq('isbn', isbn)
      .limit(1)
      .maybeSingle()
    existing = data
  }

  if (!existing && title) {
    const { data: titleMatches } = await supabase
      .from('books')
      .select('id, title, author')
      .eq('user_id', user.id)
      .ilike('title', title)

    const newAuthor = author?.toLowerCase() ?? null
    const match = (titleMatches ?? []).find((b) => {
      const existingAuthor = b.author ? b.author.trim().toLowerCase() : null
      if (newAuthor && existingAuthor) return existingAuthor === newAuthor
      return true // 둘 중 하나라도 저자 정보 없으면 제목만으로 중복 판단
    })
    existing = match ? { id: match.id, title: match.title } : null
  }

  if (existing) {
    return { error: 'duplicate', title: existing.title }
  }

  const DEFAULT_TOTAL_PAGES = 150

  // 추가 폼에는 현재 페이지 입력이 없음 — 항상 0에서 시작, 이후 BookCard에서 갱신
  const currentPage = 0
  const totalPages = formData.get('total_pages')
    ? Number(formData.get('total_pages'))
    : DEFAULT_TOTAL_PAGES
  const status = formData.get('status') as string

  await supabase.from('books').insert({
    user_id: user.id,
    title,
    author,
    isbn,
    kdc,
    total_pages: totalPages,
    current_page: currentPage,
    status,
    owned,
    // owned 컬럼이 books 테이블에 있어야 함 — Supabase에서 컬럼 추가 필요 (boolean, default true)
    started_at: formData.get('started_at') as string || null,
    completed_at: status === 'completed' ? new Date().toISOString() : null,
    // status_changed_at: "읽는 중/잠시 멈춤" 목록을 최신순으로 정렬하기 위한 값.
    // started_at(사용자가 직접 고르는 "읽기 시작일", 과거 날짜도 가능)과는 다른 개념 —
    // 이건 항상 "지금 이 상태가 된 시각"이라 목록 정렬 전용으로만 씀.
    status_changed_at: new Date().toISOString(),
  })

  revalidateBookPaths()
}

export async function updateProgress(bookId: string, currentPage: number) {
  const supabase = await createClient()

  // 총 페이지 수 + 기존 상태 조회 — status까지 같이 봐야 "이번 저장으로 막 완독됐는지"
  // (justCompleted)와 "원래 이미 완독 상태였는지"를 구분할 수 있음. 이 구분이 있어야
  // 세레모니(완등 축하 연출)를 실제 완독 순간에만 1번 띄우고, 이미 완독한 책을
  // 재저장할 때는 안 띄울 수 있음.
  const { data: book } = await supabase
    .from('books')
    .select('total_pages, status')
    .eq('id', bookId)
    .single()

  // status_changed_at을 "상태가 바뀐 시각"뿐 아니라 "마지막으로 이 책을 만진 시각"으로도
  // 쓴다 (2026.07.12부터 — 산책자 증표의 "최근 산책일" 계산용). 완독이 아닌 단순 페이지
  // 저장에서도 매번 갱신해야 진짜 최근 활동을 반영함 — 예전엔 상태 변경 때만 갱신해서,
  // 상태는 그대로 두고 페이지만 계속 업데이트하면 이 값이 오래된 채로 멈춰 있었음.
  const now = new Date().toISOString()
  const updates: Record<string, unknown> = { current_page: currentPage, status_changed_at: now }
  let justCompleted = false

  if (book?.total_pages && currentPage >= book.total_pages) {
    updates.status = 'completed'
    updates.current_page = book.total_pages // 초과 입력 방지
    updates.completed_at = now
    justCompleted = book.status !== 'completed'
  }

  const { error } = await supabase.from('books').update(updates).eq('id', bookId)
  if (error) console.error('updateProgress failed:', error.message)
  revalidateBookPaths()

  return { justCompleted }
}

export async function saveMemo(bookId: string, memo: string) {
  const supabase = await createClient()
  await supabase.from('books').update({ memo }).eq('id', bookId)
  // 예전엔 여기만 '/dashboard/books'만 갱신하고 있었음 — 다른 액션들처럼
  // '/dashboard', '/dashboard/hikes'도 같이 갱신해야 메모 수정이 두 목록에도 반영됨.
  revalidateBookPaths()
}

// 검색 결과를 고르지 않고 제목만 입력해 추가한 책은 저자가 비어(null) 저장된다.
// 카드에서 나중에 채워넣거나 고칠 수 있게 하는 액션.
export async function updateAuthor(bookId: string, author: string) {
  const supabase = await createClient()
  const trimmed = author.trim() || null
  const { error } = await supabase.from('books').update({ author: trimmed }).eq('id', bookId)
  if (error) console.error('updateAuthor failed:', error.message)
  revalidateBookPaths()
}

// 검색 결과를 안 고르고 직접 입력했거나 오타가 난 제목을 나중에 고칠 수 있게 하는 액션.
// 저자 수정(updateAuthor)과 같은 패턴 — 등록 후에도 카드에서 인라인으로 고칠 수 있음.
export async function updateTitle(bookId: string, title: string) {
  const supabase = await createClient()
  const trimmed = title.trim()
  if (!trimmed) return { error: 'empty' as const }

  const { error } = await supabase.from('books').update({ title: trimmed }).eq('id', bookId)
  if (error) console.error('updateTitle failed:', error.message)
  revalidateBookPaths()

  return { error: null }
}

// 전체 쪽수는 등록 시 검색/스캔 결과나 기본값(150쪽)으로 자동 채워지는데, 실제 책과
// 다르면 진행률이 부정확해진다. 지금까지는 등록 후 고칠 방법이 없었음 — 이 액션으로
// 카드에서 인라인 수정 가능하게 함.
// 현재 페이지와의 정합성 처리:
//  - 이미 완독(completed) 상태였던 책은 총 쪽수를 고쳐도 계속 완독으로 유지하고,
//    현재 페이지도 새 총 쪽수에 맞춰 같이 옮긴다(완독 책은 항상 current == total 이어야 함).
//  - 완독 전 책인데 새 총 쪽수가 지금까지 읽은 페이지보다 작아지면, 초과분은 새 총
//    쪽수로 잘라내고(clamp), 그 결과 현재==총 쪽수가 되면 updateProgress와 동일하게
//    자동 완독 처리한다.
export async function updateTotalPages(bookId: string, totalPages: number) {
  const supabase = await createClient()
  if (!Number.isFinite(totalPages) || totalPages < 1) return { error: 'invalid' as const }
  const safeTotalPages = Math.round(totalPages)

  const { data: book } = await supabase
    .from('books')
    .select('current_page, status')
    .eq('id', bookId)
    .single()

  const wasCompleted = book?.status === 'completed'
  let nextCurrentPage = book?.current_page ?? 0

  if (wasCompleted) {
    nextCurrentPage = safeTotalPages
  } else if (nextCurrentPage > safeTotalPages) {
    nextCurrentPage = safeTotalPages
  }

  const updates: Record<string, unknown> = {
    total_pages: safeTotalPages,
    current_page: nextCurrentPage,
  }

  let justCompleted = false
  if (!wasCompleted && nextCurrentPage >= safeTotalPages) {
    updates.status = 'completed'
    updates.completed_at = new Date().toISOString()
    updates.status_changed_at = updates.completed_at
    justCompleted = true
  }

  const { error } = await supabase.from('books').update(updates).eq('id', bookId)
  if (error) console.error('updateTotalPages failed:', error.message)
  revalidateBookPaths()

  return { error: null, currentPage: nextCurrentPage, justCompleted }
}

export async function updateOwned(bookId: string, owned: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('books').update({ owned }).eq('id', bookId)
  if (error) console.error('updateOwned failed:', error.message)
  revalidateBookPaths()
}

export async function changeStatus(bookId: string, status: string) {
  const supabase = await createClient()

  // status_changed_at: 드롭다운으로 상태를 바꿀 때마다 항상 "지금"으로 갱신 —
  // 산책기록의 읽는 중/잠시 멈춤 목록이 이 값 기준 최신순이라, 예를 들어 오래전에
  // 등록해둔 책을 오늘 "잠시 멈춤 → 읽는 중"으로 바꾸면 오늘 바꾼 다른 책들과
  // 나란히 목록 맨 위로 올라옴 (등록일이 오래됐어도 상관없음).
  const updates: Record<string, unknown> = { status, status_changed_at: new Date().toISOString() }

  // 완독으로 변경 시 현재 페이지를 총 페이지로 맞추고 완독 시각을 기록
  if (status === 'completed') {
    const { data: book } = await supabase
      .from('books')
      .select('total_pages')
      .eq('id', bookId)
      .single()
    if (book?.total_pages) {
      updates.current_page = book.total_pages
    }
    updates.completed_at = new Date().toISOString()
  } else {
    // 완독 상태에서 다시 되돌리는 경우 — 예전 완독 시각이 남아있으면
    // WorldMap 노출 유예 로직이 오작동할 수 있으니 같이 지움
    updates.completed_at = null
  }

  const { error } = await supabase.from('books').update(updates).eq('id', bookId)
  if (error) console.error('changeStatus failed:', error.message)
  revalidateBookPaths()
}

export async function deleteBook(bookId: string) {
  const supabase = await createClient()
  await supabase.from('books').delete().eq('id', bookId)
  revalidateBookPaths()
}
