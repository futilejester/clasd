import Link from 'next/link';
import {
  LayoutDashboard,
  Calendar,
  Users,
  ClipboardList,
  Send,
  Filter,
  Settings,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';

export async function Sidebar() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, plan')
    .eq('id', user!.id)
    .single();

  const isPro = profile?.plan === 'pro';

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 bg-cream-50/40 border-r border-cream-300 px-4 py-5">
      <Link
        href="/dashboard"
        className="font-display text-2xl tracking-tight px-2 mb-6"
      >
        Clasd<span className="text-clay-500">.</span>
      </Link>

      <nav className="flex-1 space-y-0.5 text-sm">
        <NavLink href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>
          Dashboard
        </NavLink>
        <NavLink href="/classes" icon={<Calendar className="h-4 w-4" />}>
          Classes
        </NavLink>
        <NavLink href="/students" icon={<Users className="h-4 w-4" />}>
          Students
        </NavLink>
        <NavLink href="/forms" icon={<ClipboardList className="h-4 w-4" />}>
          Forms
        </NavLink>
        <NavLink href="/segments" icon={<Filter className="h-4 w-4" />}>
          Segments
        </NavLink>
        <NavLink href="/campaigns" icon={<Send className="h-4 w-4" />}>
          Campaigns
        </NavLink>

        <div className="pt-6 mt-6 border-t border-cream-300 space-y-0.5">
          <NavLink href="/settings" icon={<Settings className="h-4 w-4" />}>
            Settings
          </NavLink>
        </div>
      </nav>

      <div className="border-t border-cream-300 pt-4 mt-4">
        <div className="px-2 mb-3">
          <p className="text-sm font-medium text-slate-900 truncate">
            {profile?.full_name || user?.email}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            {isPro ? (
              <Badge tone="accent">
                <Sparkles className="h-2.5 w-2.5" />
                Pro
              </Badge>
            ) : (
              <Link
                href="/settings"
                className="text-xs text-clay-600 hover:text-clay-700 inline-flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" />
                Upgrade to Pro
              </Link>
            )}
          </div>
        </div>

        <form action="/auth/logout" method="post">
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-slate-600 hover:bg-cream-200 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-2 py-1.5 rounded text-slate-600 hover:bg-cream-200 hover:text-slate-900"
    >
      {icon}
      {children}
    </Link>
  );
}
