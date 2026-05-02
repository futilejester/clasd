import { NextResponse, type NextRequest } from 'next/server';
import {
  processQueue,
  ensureRemindersForUpcomingSessions,
} from '@/lib/email/queue';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // seconds

/**
 * Hourly-ish cron entrypoint.
 *
 * Vercel Cron calls this with `Authorization: Bearer ${CRON_SECRET}`.
 * (See vercel.json — added in Chunk 7 deploy step.)
 *
 * Two tasks:
 *  1. Refresh the reminder queue (auto-reminder rows for upcoming sessions)
 *  2. Process due scheduled_messages
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization') ?? '';
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const reminders = await ensureRemindersForUpcomingSessions({});
  const queue = await processQueue(50);

  return NextResponse.json({
    ok: true,
    reminders_created: reminders.created,
    queue,
  });
}
