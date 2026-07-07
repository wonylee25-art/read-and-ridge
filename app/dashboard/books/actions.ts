'use server'

export const runtime = 'nodejs'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addBook(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const isbn = formData.get('isbn') as string || null

  // 중복 ISBN 방어: 같은 유저가 동일 ISBN을 이미 등록한 경우 차단
  // (isbn 컬럼이 books 테이블에 있어야 함 — Supabase에서 컬럼 추가 필요)
  if (isbn) {
    const { data: existing } = await supabase
      .from('books')
      .select('id, title')
      .eq('user_id', user.id)
      .eq('isbn', isbn)
      .maybeSingle()

    if (existing) {
      return { error: 'duplicate', title: existing.title }
    }
  }

  const currentPage = Number(formData.get('current_page') ?? 0)
  const totalPages = formData.get('total_pages') ? Number(formData.get('total_pages')) : null
  const requestedStatus = formData.get('status') as string

  // 시작부터 완독 페이지면 바로 completed로
  const status =
    totalPages && currentPage >= totalPages ? 'completed' : requestedStatus

  await supabase.from('books').insert({
    user_id: user.id,
    title: formData.get('title') as string,
    author: formData.get('author') as string || null,
    isbn,
    total_pages: totalPages,
    current_page: currentPage,
    status,
    started_at: formData.get('started_at') as string || null,
  })

  revalidatePath('/dashboard/books')
  revalidatePath('/dashboard')
}

export async function updateProgress(bookId: string, currentPage: number) {
  const supabase = await createClient()

  // 총 페이지 수 조회해서 완독 여부 판단
  const { data: book } = await supabase
    .from('books')
    .select('total_pages')
    .eq('id', bookId)
    .single()

  const updates: Record<string, unknown> = { current_page: currentPage }

  if (book?.total_pages && currentPage >= book.total_pages) {
    updates.status = 'completed'
    updates.current_page = book.total_pages // 초과 입력 방지
  }

  await supabase.from('books').update(updates).eq('id', bookId)
  revalidatePath('/dashboard/books')
  revalidatePath('/dashboard')
}

export async function saveMemo(bookId: string, memo: string) {
  const supabase = await createClient()
  await supabase.from('books').update({ memo }).eq('id', bookId)
  revalidatePath('/dashboard/books')
}

export async function changeStatus(bookId: string, status: string) {
  const supabase = await createClient()

  const updates: Record<string, unknown> = { status }

  // 완독으로 변경 시 현재 페이지를 총 페이지로 맞춤
  if (status === 'completed') {
    const { data: book } = await supabase
      .from('books')
      .select('total_pages')
      .eq('id', bookId)
      .single()
    if (book?.total_pages) {
      updates.current_page = book.total_pages
    }
  }

  await supabase.from('books').update(updates).eq('id', bookId)
  revalidatePath('/dashboard/books')
  revalidatePath('/dashboard')
}

export async function deleteBook(bookId: string) {
  const supabase = await createClient()
  await supabase.from('books').delete().eq('id', bookId)
  revalidatePath('/dashboard/books')
  revalidatePath('/dashboard')
}
