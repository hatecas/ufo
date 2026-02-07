import './globals.css';

export const metadata = {
  title: 'UFO Catcher Master - AI 크레인게임 공략',
  description: 'AI가 분석하는 UFO 캐쳐 공략 시스템. 사진을 올리면 최적의 공략법을 알려드립니다.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'UFO Master',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0a0a0f',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
