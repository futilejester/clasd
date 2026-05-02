import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { buildSessionInvite } from '@/lib/email/ics';

export const dynamic = 'force-dynamic';

/**
 * Single session .ics download.
 *
 * URL format: /cal/session/{sessionId}/event.ics?token={class_calendar_token}
 *
 * Used as a fallback link inside emails for clients that don't render
 * the attachment. The token is the parent class's calendar_token.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return new NextResponse('Token required', { status: 401 });
  }

  const supabase = createServiceClient();

  // Fetch the session + its parent class in one go
  const { data: session } = await supabase
    .from('class_sessions')
    .select(
      'id, starts_at, ends_at, status, notes, class_id, classes(id, title, description, location, instructor_name, calendar_token, user_id)'
    )
    .eq('id', params.sessionId)
    .maybeSingle();

  const cls = session?.classes as unknown as {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    instructor_name: string | null;
    calendar_token: string;
    user_id: string;
  } | null;

  if (!session || !cls || cls.calendar_token !== token) {
    return new NextResponse('Not found', { status: 404 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', cls.user_id)
    .single();

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const { content, filename } = buildSessionInvite({
    cls: {
      id: cls.id,
      title: cls.title,
      description: cls.description,
      location: cls.location,
      instructor_name: cls.instructor_name,
    },
    session: {
      id: session.id,
      starts_at: session.starts_at,
      ends_at: session.ends_at,
      status: session.status,
      notes: session.notes,
    },
    sender: {
      name: profile?.full_name ?? null,
      email: profile?.email ?? 'noreply@clasd.app',
    },
    appUrl,
  });

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
