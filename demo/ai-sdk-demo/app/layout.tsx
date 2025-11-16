import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SkyFi MCP Demo - AI SDK',
  description: 'Interactive demo of SkyFi MCP with Vercel AI SDK',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

