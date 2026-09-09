import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '紙ひこうき郵便局 | かぜのまち',
  icons: { icon: process.env.GITHUB_PAGES === 'true' ? '/paper-plane-post/favicon.svg' : '/favicon.svg' },
  description: '風とゴムの力で紙ひこうきをとばそう。どうぶつたちに手紙をとどける、小学3年生のためのゲーム。',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
