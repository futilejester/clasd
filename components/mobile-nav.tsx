'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  LayoutDashboard,
  Calendar,
  Users,
  ClipboardList,
  Send,
  Filter,
  Settings,
  LogOut,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/classes', label: 'Classes', icon: Calendar },
  { href: '/students', label: 'Students', icon: Users },
  { href: '/forms', label: 'Forms', icon: ClipboardList },
  { href: '/segments', label: 'Segments', icon: Filter },
  { href: '/campaigns', label: 'Campaigns', icon: Send },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  return (
    <>
      <header className="md:hidden sticky top-0 z-30 bg-cream-50/95 backdrop-blur border-b border-cream-300 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-display text-xl tracking-tight">
          Clasd<span className="text-clay-500">.</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="h-10 w-10 inline-flex items-center justify-center rounded text-slate-700 hover:bg-cream-200"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open ? (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <nav className="absolute left-0 top-0 bottom-0 w-72 bg-cream-50 border-r border-cream-300 flex flex-col py-5 px-4 shadow-soft">
            <div className="flex items-center justify-between mb-6">
              <Link
                href="/dashboard"
                className="font-display text-2xl tracking-tight"
              >
                Clasd<span className="text-clay-500">.</span>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="h-10 w-10 inline-flex items-center justify-center rounded text-slate-700 hover:bg-cream-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ul className="flex-1 space-y-0.5 text-sm">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={
                        'flex items-center gap-2 px-2 py-2 rounded ' +
                        (active
                          ? 'bg-clay-100 text-clay-700'
                          : 'text-slate-600 hover:bg-cream-200 hover:text-slate-900')
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-cream-300 pt-4">
              <form action="/auth/logout" method="post">
                <button
                  type="submit"
                  className="w-full flex items-center gap-2 px-2 py-2 rounded text-sm text-slate-600 hover:bg-cream-200 hover:text-slate-900"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </div>
          </nav>
        </div>
      ) : null}
    </>
  );
}
