// 책 검색 API에서 받아온 저자/역자 원문은 형식이 들쭉날쭉하다.
// 예: "상바오 외 지음 ;박우 옮김", "저자 : 기시 마사히코 ;역자 : 정세경;"
// 이걸 항상 "저자 지음 · 역자 옮김" (역자 없으면 "저자 지음") 형태로 통일해서 보여준다.
export function formatAuthor(raw: string | null | undefined): string | null {
  if (!raw) return null

  const segments = raw
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)

  if (segments.length === 0) return null

  const authors: string[] = []
  const translators: string[] = []

  for (const segment of segments) {
    const isTranslator = /역자|옮긴이|옮김/.test(segment)

    const name = segment
      .replace(/저자|지은이|글쓴이|역자|옮긴이/g, '')
      .replace(/지음|옮김/g, '')
      .replace(/^\s*[:：]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (!name) continue
    if (isTranslator) translators.push(name)
    else authors.push(name)
  }

  const authorText = authors.join(', ')
  const translatorText = translators.join(', ')

  if (authorText && translatorText) return `${authorText} 지음 · ${translatorText} 옮김`
  if (authorText) return `${authorText} 지음`
  if (translatorText) return `${translatorText} 옮김`

  // 아무 패턴도 안 맞으면 원문이라도 정리해서 보여줌
  return raw.trim()
}
