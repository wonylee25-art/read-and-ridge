import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const HEADERS = [
  'title',
  'author',
  'isbn',
  'status',
  'owned',
  'total_pages',
  'current_page',
  'started_at',
  'completed_at',
  'memo',
] as const

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: books, error } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', user.id)
    .order('title', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (books ?? []).map((book) =>
    HEADERS.map((key) => csvEscape((book as Record<string, unknown>)[key])).join(',')
  )
  const csv = [HEADERS.join(','), ...rows].join('\r\n')

  // 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM 추가
  const body = '﻿' + csv
  const filename = `read-and-ridge-books-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
