'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addBook(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const isbn = formData.get('isbn') as string || null
  // 체크박스는 체크됐을 때만 폼에 값이 실려온다 ('on') — 없으면 소장 안 함
  const owned = formData.get('owned') === 'on'
  const title = ((formData.get('title') as string) || '').trim()
  const author = ((formData.get('author') as string) || '').trim() || null

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
    total_pages: totalPages,
    current_page: currentPage,
    status,
    owned,
    // owned 컬럼이 books 테이블에 있어야 함 — Supabase에서 컬럼 추가 필요 (boolean, default true)
    started_at: formData.get('started_at') as string || null,
    completed_at: status === 'completed' ? new Date().toISOString() : null,
  })

  revalidatePath('/dashboard/books')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/hikes')
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

  const updates: Record<string, unknown> = { current_page: currentPage }
  let justCompleted = false

  if (book?.total_pages && currentPage >= book.total_pages) {
    updates.status = 'completed'
    updates.current_page = book.total_pages // 초과 입력 방지
    updates.completed_at = new Date().toISOString()
    justCompleted = book.status !== 'completed'
  }

  const { error } = await supabase.from('books').update(updates).eq('id', bookId)
  if (error) console.error('updateProgress failed:', error.message)
  revalidatePath('/dashboard/books')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/hikes')

  return { justCompleted }
}

export async function saveMemo(bookId: string, memo: string) {
  const supabase = await createClient()
  await supabase.from('books').update({ memo }).eq('id', bookId)
  revalidatePath('/dashboard/books')
}

// 검색 결과를 고르지 않고 제목만 입력해 추가한 책은 저자가 비어(null) 저장된다.
// 카드에서 나중에 채워넣거나 고칠 수 있게 하는 액션.
export async function updateAuthor(bookId: string, author: string) {
  const supabase = await createClient()
  const trimmed = author.trim() || null
  const { error } = await supabase.from('books').update({ author: trimmed }).eq('id', bookId)
  if (error) console.error('updateAuthor failed:', error.message)
  revalidatePath('/dashboard/books')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/hikes')
}

export async function updateOwned(bookId: string, owned: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('books').update({ owned }).eq('id', bookId)
  if (error) console.error('updateOwned failed:', error.message)
  revalidatePath('/dashboard/books')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/hikes')
}

export async function changeStatus(bookId: string, status: string) {
  const supabase = await createClient()

  const updates: Record<string, unknown> = { status }

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
    // 24시간 유예 로직이 오작동할 수 있으니 같이 지움
    updates.completed_at = null
  }

  const { error } = await supabase.from('books').update(updates).eq('id', bookId)
  if (error) console.error('changeStatus failed:', error.message)
  revalidatePath('/dashboard/books')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/hikes')
}

export async function deleteBook(bookId: string) {
  const supabase = await createClient()
  await supabase.from('books').delete().eq('id', bookId)
  revalidatePath('/dashboard/books')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/hikes')
}
