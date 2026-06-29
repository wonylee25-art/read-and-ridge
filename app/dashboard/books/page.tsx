import { createClient } from '@/lib/supabase/server'
import AddBookForm from '@/components/books/AddBookForm'
import BookCard from '@/components/books/BookCard'

export default async function BooksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: books } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const reading = books?.filter((b) => b.status === 'reading') ?? []
  const completed = books?.filter((b) => b.status === 'completed') ?? []
  const paused = books?.filter((b) => b.status === 'paused') ?? []

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">독서 기록</h2>
          <p className="text-gray-400 text-sm mt-1">총 {books?.length ?? 0}권</p>
        </div>
        <AddBookForm />
      </div>

      {(!books || books.length === 0) && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">아직 책이 없어요</p>
          <p className="text-sm mt-1">첫 번째 책을 추가해보세요 📚</p>
        </div>
      )}

      {reading.length > 0 && (
        <section className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">읽는 중</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {reading.map((book) => <BookCard key={book.id} book={book} />)}
          </div>
        </section>
      )}

      {paused.length > 0 && (
        <section className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">잠시 멈춤</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {paused.map((book) => <BookCard key={book.id} book={book} />)}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">완독</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {completed.map((book) => <BookCard key={book.id} book={book} />)}
          </div>
        </section>
      )}
    </div>
  )
}
