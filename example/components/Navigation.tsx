'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/todos', label: 'Todo List', description: 'Basic CRUD with collections' },
  { href: '/profile', label: 'User Profile', description: 'Entity queries with auto-save' },
  { href: '/feed', label: 'Social Feed', description: 'Infinite scrolling' },
  { href: '/cart', label: 'Shopping Cart', description: 'Multi-query updates' },
  { href: '/advanced', label: 'Advanced', description: 'Query options & callbacks' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="app-nav">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-link ${pathname === item.href ? 'active' : ''}`}
        >
          <span className="nav-label">{item.label}</span>
          <span className="nav-description">{item.description}</span>
        </Link>
      ))}
    </nav>
  );
}
