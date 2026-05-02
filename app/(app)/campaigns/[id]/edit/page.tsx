import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { CampaignEditor } from './campaign-editor';

export default async function EditCampaignPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: campaign }, { data: classes }, { data: segments }] =
    await Promise.all([
      supabase
        .from('campaigns')
        .select(
          'id, name, subject, body_html, template_id, class_id, segment_id, attach_ics, ics_session_id, status'
        )
        .eq('id', params.id)
        .single(),
      supabase
        .from('classes')
        .select('id, title, default_duration_minutes')
        .eq('archived', false)
        .order('title'),
      supabase
        .from('segments')
        .select('id, name, target, member_count')
        .order('name'),
    ]);

  if (!campaign) notFound();

  let sessions: Array<{
    id: string;
    starts_at: string;
    ends_at: string;
    status: string;
  }> = [];
  if (campaign.class_id) {
    const { data } = await supabase
      .from('class_sessions')
      .select('id, starts_at, ends_at, status')
      .eq('class_id', campaign.class_id)
      .gte('starts_at', new Date().toISOString())
      .neq('status', 'cancelled')
      .order('starts_at', { ascending: true });
    sessions = data ?? [];
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to campaigns
      </Link>

      <CampaignEditor
        campaign={campaign}
        classes={classes ?? []}
        segments={segments ?? []}
        sessions={sessions}
        myEmail={user?.email ?? ''}
      />
    </div>
  );
}
