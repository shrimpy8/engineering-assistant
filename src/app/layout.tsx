import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import './globals.css';

/**
 * Global metadata for the app shell.
 */
export const metadata: Metadata = {
  title: 'Engineering Assistant',
  description: 'Local-first AI assistant for codebase analysis',
};

/**
 * Root layout with error boundary and design system
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
