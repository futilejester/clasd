import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { buildClassFeed } from '@/lib/email/ics';

export const dynamic = 'force-dynamic';

/**
 * Public subscribable calendar feed.
 *
 * URL format: /cal/{classId}/calendar.ics?token={calendar_token}
 *
 * The token is the shared secret authorising read — without it, requests
 * are rejected. Tokens are 32-char hex strings and are not guessable.
 *
 * In a calendar app, the user pastes the full URL (with ?token=) into
 * "Subscribe to calendar" / "Add by URL".
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { classId: string } }
) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return new NextResponse('Token required', { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: cls, error } = await supabase
    .from('classes')
    .select(
      'id, title, description, location, instructor_name, calendar_token, user_id'
    )
    .eq('id', params.classId)
    .maybeSingle();

  if (error) {
    return new NextResponse('Calendar unavailable', { status: 500 });
  }
  if (!cls || cls.calendar_token !== token) {
    return new NextResponse('Not found', { status: 404 });
  }

  // Past 30 days + all future. Keeps the feed compact for very old classes.
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: sessions } = await supabase
    .from('class_sessions')
    .select('id, starts_at, ends_at, status, notes')
    .eq('class_id', cls.id)
    .gte('starts_at', thirtyDaysAgo)
    .order('starts_at', { ascending: true });

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', cls.user_id)
    .single();

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const ics = buildClassFeed({
    cls: {
      id: cls.id,
      title: cls.title,
      description: cls.description,
      location: cls.location,
      instructor_name: cls.instructor_name,
    },
    sessions: (sessions ?? []).map((s) => ({
      id: s.id,
      starts_at: s.starts_at,
      ends_at: s.ends_at,
      status: s.status,
      notes: s.notes,
    })),
    sender: {
      name: profile?.full_name ?? null,
      email: profile?.email ?? 'noreply@clasd.app',
    },
    appUrl,
  });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="${slugFile(cls.title)}.ics"`,
      'Cache-Control': 'public, max-age=300',
    },
  });
}

function slugFile(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'class'
  );
}
