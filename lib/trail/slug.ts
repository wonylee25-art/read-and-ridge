// 공개 지형도 링크(/trail/[slug])의 slug 생성.
//
// ⚠ 닉네임·이메일·user_id에서 파생하지 않는다 — 그러면 남의 slug를 추측해서
// "이 사람도 공개했나" 열거가 가능해진다. 공개 여부 자체가 사적인 정보다.
// 암호학적 난수에서 뽑고, 공개 페이지는 slug가 맞을 때만 응답한다.
//
// 알파벳: 숫자/영소문자에서 혼동하기 쉬운 글자(0/o, 1/l/i)를 뺀 Crockford 계열 32자.
// 링크를 눈으로 읽거나 불러줄 일이 있어서(카톡·구두 전달) 오독을 줄인다.
import { randomBytes } from 'crypto'

const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz' // 31자 — 0,1,i,l,o 제외
const SLUG_LENGTH = 12 // 31^12 ≈ 7.9e17. 무작위 대입으로 남의 링크를 찾는 건 사실상 불가능

export function generateShareSlug(): string {
  // 모듈로 편향을 피하려고 필요한 만큼 넉넉히 뽑고 알파벳 범위 밖 값은 버린다.
  let out = ''
  while (out.length < SLUG_LENGTH) {
    const bytes = randomBytes(SLUG_LENGTH * 2)
    for (let i = 0; i < bytes.length && out.length < SLUG_LENGTH; i++) {
      const b = bytes[i]
      if (b < 248) out += ALPHABET[b % ALPHABET.length] // 248 = 31*8, 편향 없는 구간만 사용
    }
  }
  return out
}

// 주소창에서 들어온 값이 slug 형태인지 — DB 조회 전에 걸러낸다.
export function isValidShareSlug(slug: string): boolean {
  if (slug.length !== SLUG_LENGTH) return false
  for (const ch of slug) if (!ALPHABET.includes(ch)) return false
  return true
}
