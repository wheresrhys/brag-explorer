import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const name = process.env.NEXT_PUBLIC_OWNER_NAME ?? 'My';

export const metadata: Metadata = {
  title: `${name}'s Work History Explorer`,
  description: `Explore ${name}'s work experience by asking questions`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-stone-50 text-stone-900`}>
        {children}
      </body>
    </html>
  );
}
