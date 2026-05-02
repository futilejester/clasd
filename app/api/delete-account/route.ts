import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Permanently delete the user's account and all associated data.
 *
 * Requires the user to type their email as confirmation in the request body.
 *
 * Order matters:
 *  1. Verify auth + confirmation
 *  2. Cascade-delete user-owned tables (most have ON DELETE CASCADE on user_id,
 *     but we delete explicitly anyway so the audit trail is clear and we don't
 *     rely on FK config)
 *  3. Delete the profile row
 *  4. Delete the auth.users row via admin API (this also removes the active
 *     session)
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { confirm_email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (
    !body.confirm_email ||
    body.confirm_email.toLowerCase() !== (user.email ?? '').toLowerCase()
  ) {
    return NextResponse.json(
      {
        error:
          'Email confirmation does not match. This action cannot be undone.',
      },
      { status: 400 }
    );
  }

  const admin = createServiceClient();

  // Cascade. Order matters to avoid FK violations on tables that don't have
  // ON DELETE CASCADE configured.
  const userId = user.id;

  // Delete in order from leaf to root
  await admin.from('delivery_events').delete().eq('user_id', userId);
  await admin.from('scheduled_messages').delete().eq('user_id', userId);
  await admin.from('campaigns').delete().eq('user_id', userId);
  await admin.from('segments').delete().eq('user_id', userId);
  await admin.from('attendance').delete().eq('user_id', userId);
  await admin.from('enrolments').delete().eq('user_id', userId);
  await admin.from('signup_forms').delete().eq('user_id', userId);
  await admin.from('class_sessions').delete().eq('user_id', userId);
  await admin.from('classes').delete().eq('user_id', userId);
  await admin.from('students').delete().eq('user_id', userId);
  await admin.from('profiles').delete().eq('id', userId);

  // Finally delete the auth user (revokes session, removes from auth.users)
  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) {
    return NextResponse.json(
      { error: `Account data deleted but auth removal failed: ${authError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
