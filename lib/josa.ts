// 한국어 조사 자동 선택. "『사피엔스』을(를)"처럼 괄호를 달아두면 문장이 사무적으로
// 읽혀서, 받침을 보고 맞는 쪽을 고른다.
//
// 한글이 아닌 글자(영문·숫자·기호)로 끝나면 받침 없음으로 친다 — 실제 발음은
// 제각각이지만("book을", "AI를") 앱에 등록되는 제목은 대부분 한글이고, 틀렸을 때
// 덜 어색한 쪽이 받침 없음이다.
export function hasFinalConsonant(word: string): boolean {
  const last = word.trim().slice(-1)
  if (!last) return false
  const code = last.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false // 한글 음절이 아님
  return (code - 0xac00) % 28 !== 0
}

// josa('사피엔스', '을', '를') → '를'
export function josa(word: string, withFinal: string, withoutFinal: string): string {
  return hasFinalConsonant(word) ? withFinal : withoutFinal
}

// '으로/로'만 규칙이 다르다 — ㄹ 받침은 받침이 있어도 '로'다("서울로", "물로").
export function euro(word: string): string {
  const last = word.trim().slice(-1)
  if (!last) return '로'
  const code = last.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return '로'
  const final = (code - 0xac00) % 28
  return final === 0 || final === 8 ? '로' : '으로' // 8 = ㄹ
}
