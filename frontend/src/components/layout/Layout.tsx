import type { ReactNode } from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="app">
      <Header />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
