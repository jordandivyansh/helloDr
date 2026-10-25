import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Littleleaf | Dr. Ruchi Lamyan', description: 'Thoughtful pediatric care with Dr. Ruchi Lamyan at ATS Nobility, Greater Noida.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
