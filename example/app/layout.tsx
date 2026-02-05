import type { Metadata } from 'next';
import { Providers } from './providers';
import { Navigation } from '@/components/Navigation';
import './globals.css';

export const metadata: Metadata = {
  title: 'query-optimistic Examples',
  description: 'Examples demonstrating all features of query-optimistic',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="app">
            <header className="app-header">
              <h1>query-optimistic Examples</h1>
              <p>A lightweight wrapper around TanStack Query for intuitive optimistic updates</p>
            </header>
            <Navigation />
            <main className="app-main">{children}</main>
            <footer className="app-footer">
              <p>
                View the source code in the <code>example/</code> folder to learn how each feature
                works.
              </p>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
