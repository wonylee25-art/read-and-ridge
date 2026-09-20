import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "산책또산책 - Read & Ridge",
  description: "책과 산, 나만의 기록 공간",
  // 홈 화면에 추가했을 때 — manifest(app/manifest.ts)는 Next가 자동으로 걸어주지만,
  // iOS 사파리는 manifest 대신 아래 apple 아이콘과 appleWebApp 설정을 본다.
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "산책또산책",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#f9fafb",
  // 지형도를 두 손가락으로 확대하는 건 막지 않는다 — 픽셀 산을 들여다보는 화면이라
  // 확대가 오히려 필요하다. 대신 입력창을 눌렀을 때 화면이 확 당겨지지 않도록
  // 초기 배율만 고정한다.
  initialScale: 1,
  width: "device-width",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
