import Link from 'next/link'

export const metadata = {
  title: '이용약관 | 산책또산책',
}

export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 text-sm leading-relaxed text-gray-700">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">이용약관</h1>
      <p className="text-xs text-gray-400 mb-8">
        시행일자: 2026년 7월 8일 · <Link href="/privacy" className="underline hover:text-gray-600">개인정보처리방침 보기</Link>
      </p>

      <section className="mb-7">
        <h2 className="font-semibold text-gray-900 mb-2">제1조 (목적)</h2>
        <p>
          이 약관은 산책또산책(이하 &quot;서비스&quot;)을 이용함에 있어 서비스와 이용자의 권리,
          의무 및 책임사항, 이용 조건 및 절차 등 기본적인 사항을 정하는 것을 목적으로 합니다.
        </p>
      </section>

      <section className="mb-7">
        <h2 className="font-semibold text-gray-900 mb-2">제2조 (정의)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>&quot;서비스&quot;란 산책또산책이 제공하는 독서 기록, 완독 기록, 픽셀 월드맵 등 일체의 기능을 말합니다.</li>
          <li>&quot;이용자&quot;란 이 약관에 따라 서비스를 이용하는 회원을 말합니다.</li>
          <li>&quot;콘텐츠&quot;란 이용자가 서비스 내에 등록한 책 정보, 독서 진행률, 메모 등 일체의 정보를 말합니다.</li>
        </ul>
      </section>

      <section className="mb-7">
        <h2 className="font-semibold text-gray-900 mb-2">제3조 (약관의 효력 및 변경)</h2>
        <p>
          이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이
          발생합니다. 서비스는 필요한 경우 관계 법령을 위반하지 않는 범위에서 이 약관을 변경할 수
          있으며, 변경된 약관은 서비스 내 공지 등을 통해 사전에 안내합니다.
        </p>
      </section>

      <section className="mb-7">
        <h2 className="font-semibold text-gray-900 mb-2">제4조 (서비스의 제공 및 변경)</h2>
        <p>
          서비스는 구글 소셜 로그인을 통한 회원가입, 도서 등록 및 독서 진행률 관리, 완독 기록,
          픽셀 월드맵 시각화, 기록 데이터 내보내기(CSV) 등의 기능을 제공합니다. 서비스는 운영상,
          기술상 필요에 따라 제공하는 서비스의 내용을 변경할 수 있습니다. 이 서비스는 현재 무료로
          제공되는 개인 프로젝트이며, 유료 기능이 추가될 경우 사전에 별도로 안내합니다.
        </p>
      </section>

      <section className="mb-7">
        <h2 className="font-semibold text-gray-900 mb-2">제5조 (회원의 의무)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>이용자는 관계 법령, 이 약관의 규정, 이용안내 등 서비스가 정한 사항을 준수해야 합니다.</li>
          <li>이용자는 타인의 계정을 도용하거나 서비스를 부정한 목적으로 이용해서는 안 됩니다.</li>
          <li>이용자는 서비스 운영을 방해하거나 서버에 과도한 부하를 주는 행위를 해서는 안 됩니다.</li>
        </ul>
      </section>

      <section className="mb-7">
        <h2 className="font-semibold text-gray-900 mb-2">제6조 (콘텐츠의 관리)</h2>
        <p>
          이용자가 서비스에 등록한 콘텐츠(책 정보, 메모 등)의 권리는 이용자 본인에게 있습니다.
          서비스는 이용자가 등록한 콘텐츠를 서비스 제공 목적(예: 픽셀 월드맵 시각화, 완등기록
          표시) 범위 내에서만 이용하며, 이용자가 콘텐츠를 삭제하면 서비스 화면에서도 즉시
          제거됩니다.
        </p>
      </section>

      <section className="mb-7">
        <h2 className="font-semibold text-gray-900 mb-2">제7조 (서비스 제공의 중단)</h2>
        <p>
          서비스는 개인이 운영하는 프로젝트로, 서버 점검, 기술적 문제, 운영상 필요 등의 사유로
          서비스의 전부 또는 일부가 일시적으로 또는 영구적으로 중단될 수 있습니다. 서비스 중단이
          예상되는 경우 가능한 범위에서 사전에 안내합니다.
        </p>
      </section>

      <section className="mb-7">
        <h2 className="font-semibold text-gray-900 mb-2">제8조 (면책조항)</h2>
        <p>
          서비스는 무료로 제공되는 개인 프로젝트로, 천재지변, 서버 장애 등 부득이한 사유로 서비스를
          제공할 수 없는 경우 책임이 면제됩니다. 서비스는 이용자가 등록한 콘텐츠의 정확성이나
          신뢰성을 보증하지 않으며, 도서 정보(국립중앙도서관 API, Open Library API 제공)의 오류에
          대해서도 책임을 지지 않습니다.
        </p>
      </section>

      <section className="mb-7">
        <h2 className="font-semibold text-gray-900 mb-2">제9조 (회원 탈퇴)</h2>
        <p>
          이용자는 사이드바 하단의 &quot;회원 탈퇴&quot; 버튼을 통해 언제든 직접 탈퇴할 수
          있습니다. 탈퇴 시 이용자가 등록한 콘텐츠와 계정은 관계 법령에 따른 보존 의무가 없는 한
          지체 없이 파기되며, 이 작업은 되돌릴 수 없습니다.
        </p>
      </section>

      <section className="mb-7">
        <h2 className="font-semibold text-gray-900 mb-2">제10조 (저작권의 귀속)</h2>
        <p>
          서비스의 디자인, 로고, 픽셀 아트, 코드 등에 대한 저작권은 서비스 운영자에게 있습니다.
          서비스 내 도서 정보(표지, 제목, 저자 등)는 국립중앙도서관 서지정보(SEOJI) API 및 Open
          Library API를 통해 제공되며, 각 저작물의 저작권은 해당 출판사 및 저작권자에게 있습니다.
        </p>
      </section>

      <section className="mb-7">
        <h2 className="font-semibold text-gray-900 mb-2">제11조 (분쟁해결 및 준거법)</h2>
        <p>
          이 약관은 대한민국 법령에 따라 규율되고 해석됩니다. 서비스 이용과 관련하여 분쟁이 발생한
          경우, 이용자와 서비스는 원만한 해결을 위해 성실히 협의합니다.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-semibold text-gray-900 mb-2">제12조 (문의처)</h2>
        <p>
          서비스 이용 관련 문의사항은 아래 이메일로 연락해 주세요.
          <br />
          이메일: readandridge@gmail.com
        </p>
      </section>

      <hr className="border-gray-100 mb-6" />

      <section className="text-xs text-gray-400">
        <p>© 2026 산책또산책. All rights reserved.</p>
      </section>
    </main>
  )
}
