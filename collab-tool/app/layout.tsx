import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Collab - 메신저 협업 도구",
  description: "카카오톡 채팅방과 함께하는 가벼운 협업 도구. 링크 하나로 모두가 함께 수정할 수 있습니다.",
  // PWA
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Collab",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  // 모바일 뷰포트 최적화 - 카카오 인앱 브라우저 대응
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // iOS safe area
  viewportFit: "cover",
  themeColor: "#3B82F6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}
