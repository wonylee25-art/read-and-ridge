import Link from 'next/link'

export const metadata = {
  title: '개인정보처리방침 | 산책또산책',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 text-sm leading-relaxed text-gray-700">
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-900">개인정보처리방침</h1>
        <Link
          href="/dashboard"
          className="text-xs text-gray-400 underline hover:text-gray-600 whitespace-nowrap mt-2"
        >
          🔙 메인화면으로 돌아가기
        </Link>
      </div>
      <p className="text-xs text-gray-400 mb-8">
        시행일자: 2026년 7월 8일 · <Link href="/terms" className="underline hover:text-gray-600">이용약관 보기</Link>
      </p>

      <p className="mb-8">
        산책또산책(이하 &quot;서비스&quot;)은 이용자의 개인정보를 소중히 다루며, 관련 법령을 준수하기
        위해 노력합니다. 본 방침은 서비스가 어떤 개인정보를 수집하고 어떻게 이용·보관하는지
        안내합니다.
      </p>

      <section className="mb-7">
        <h2 className="font-semibold text-gray-900 mb-2">1. 수집하는 개인정보 항목</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>구글 소셜 로그인을 통해 제공받는 정보: 이메일 주소, 이름, 프로필 사진</li>
          <li>
            이용자가 서비스 이용 중 직접 입력하는 정보: 등록한 책 제목·저자·ISBN, 독서 진행률
            (읽은 페이지 수), 메모, 완독 기록
          </li>
          <li>서비스 이용 과정에서 자동 생성·수집되는 정보: 로그인 세션 쿠키, 접속 기록</li>
        </ul>
      </section>

      <section className="mb-7">
        <h2 className="font-semibold text-gray-900 mb-2">2. 개인정보 수집 및 이용 목적</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>회원 식별 및 로그인 상태 유지</li>
          <li>독서·완독 기록, 픽셀 월드맵 등 서비스 핵심 기능 제공</li>
          <li>서비스 오류 대응 및 품질 개선</li>
        </ul>
      </section>

      <section className="mb-7">
        <h2 className="font-semibold text-gray-900 mb-2">3. 개인정보 보유 및 이용 기간</h2>
        <p>
          사이드바 하단의 &quot;회원 탈퇴&quot; 버튼으로 언제든 직접 탈퇴할 수 있으며, 탈퇴 즉시
          등록한 책·독서 기록 등 개인정보가 지체 없이 파기되고 계정 자체도 함께 삭제됩니다. 관계
          법령에 따라 별도 보존이 필요한 정보가 있는 경우, 해당 법령에서 정한 기간 동안 보관 후
          파기합니다.
        </p>
      </section>

      <section className="mb-7">
        <h2 className="font-semibold text-gray-900 mb-2">4. 개인정보의 제3자 제공 및 위탁</h2>
        <p className="mb-2">
          서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만 서비스 운영을
          위해 아래와 같은 외부 서비스를 이용하고 있으며, 각 서비스에는 해당 사업자의 개인정보
          처리방침이 함께 적용될 수 있습니다.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Supabase — 인증(로그인) 및 데이터베이스 호스팅</li>
          <li>Google — 소셜 로그인(OAuth)</li>
          <li>국립중앙도서관 서지정보(SEOJI) API, Open Library API — 도서 정보 조회 (이용자 개인정보는 전송되지 않습니다)</li>
        </ul>
      </section>

      <section className="mb-7">
        <h2 className="font-semibold text-gray-900 mb-2">5. 이용자의 권리</h2>
        <p>
          이용자는 언제든 본인의 개인정보에 대한 열람, 정정, 삭제를 요청할 수 있습니다. 로그아웃은
          사이드바 하단의 &quot;로그아웃&quot; 버튼을, 개인정보 삭제(회원 탈퇴)는 같은 자리의
          &quot;회원 탈퇴&quot; 버튼을 이용해 주세요. 그 밖의 열람·정정 요청은 아래 문의처로
          연락해 주시면 확인 후 처리해 드립니다.
        </p>
      </section>

      <section className="mb-7">
        <h2 className="font-semibold text-gray-900 mb-2">6. 쿠키(Cookie)의 사용</h2>
        <p>
          서비스는 로그인 세션을 유지하기 위한 목적으로 쿠키를 사용합니다. 브라우저 설정에서 쿠키
          저장을 거부할 수 있으나, 이 경우 로그인이 정상적으로 동작하지 않을 수 있습니다.
        </p>
      </section>

      <section className="mb-7">
        <h2 className="font-semibold text-gray-900 mb-2">7. 아동의 개인정보 보호</h2>
        <p>
          본 서비스는 만 14세 미만 아동을 주요 이용 대상으로 하지 않으며, 만 14세 미만 아동의
          개인정보를 의도적으로 수집하지 않습니다.
        </p>
      </section>

      <section className="mb-7">
        <h2 className="font-semibold text-gray-900 mb-2">8. 개인정보의 안전성 확보 조치</h2>
        <p>
          서비스는 Supabase의 Row Level Security(행 단위 접근 제어)를 적용해, 이용자 본인의 데이터는
          본인만 조회·수정할 수 있도록 관리하고 있습니다.
        </p>
      </section>

      <section className="mb-7">
        <h2 className="font-semibold text-gray-900 mb-2">9. 문의처</h2>
        <p>
          개인정보 관련 문의사항은 아래 이메일로 연락해 주세요.
          <br />
          이메일: readandridge@gmail.com
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-semibold text-gray-900 mb-2">10. 고지의 의무</h2>
        <p>
          본 방침은 관련 법령 및 서비스 정책 변경에 따라 개정될 수 있으며, 내용이 변경되는 경우
          서비스 내 공지 등을 통해 사전에 안내합니다.
        </p>
      </section>

      <hr className="border-gray-100 mb-6" />

      <section className="text-xs text-gray-400">
        <p className="mb-1">© 2026 산책또산책. All rights reserved.</p>
        <p>
          서비스 내 도서 정보(표지, 제목, 저자 등)는 국립중앙도서관 서지정보(SEOJI) API 및 Open
          Library API를 통해 제공되며, 각 저작물의 저작권은 해당 출판사 및 저작권자에게 있습니다.
        </p>
      </section>
    </main>
  )
}
