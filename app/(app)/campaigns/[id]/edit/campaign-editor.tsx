'use client';

import Link from 'next/link';
import { useState, useTransition, useEffect, useRef } from 'react';
import { Send, Save, Beaker, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RichTextEditor } from '@/components/rich-text-editor';
import { renderMerge, sampleContext } from '@/lib/email/merge';
import { formatDateTime } from '@/lib/dates';
import {
  updateCampaign,
  sendTestEmail,
  sendCampaign,
  deleteCampaign,
} from '../../actions';

type ClassOpt = { id: string; title: string; default_duration_minutes: number };
type SessionOpt = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
};
type SegmentOpt = {
  id: string;
  name: string;
  target: 'students' | 'enrolments';
  member_count: number;
};

interface CampaignEditorProps {
  campaign: {
    id: string;
    name: string;
    subject: string;
    body_html: string | null;
    template_id: string | null;
    class_id: string | null;
    segment_id: string | null;
    attach_ics: boolean;
    ics_session_id: string | null;
    status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  };
  classes: ClassOpt[];
  segments: SegmentOpt[];
  sessions: SessionOpt[];
  myEmail: string;
}

export function CampaignEditor({
  campaign,
  classes,
  segments,
  sessions: initialSessions,
  myEmail,
}: CampaignEditorProps) {
  const [name, setName] = useState(campaign.name);
  const [subject, setSubject] = useState(campaign.subject);
  const [bodyHtml, setBodyHtml] = useState(campaign.body_html ?? '');
  const [classId, setClassId] = useState(campaign.class_id ?? '');
  const [segmentId, setSegmentId] = useState(campaign.segment_id ?? '');
  const [attachIcs, setAttachIcs] = useState(campaign.attach_ics);
  const [icsSessionId, setIcsSessionId] = useState(
    campaign.ics_session_id ?? ''
  );
  const [sessions] = useState<SessionOpt[]>(initialSessions);
  const [previewing, setPreviewing] = useState(false);

  const [, startSaveTransition] = useTransition();
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>(
    'idle'
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isSending, startSendTransition] = useTransition();
  const [isTesting, startTestTransition] = useTransition();

  // Targeting: segment_id wins. Selecting a segment clears class_id.
  function onSegmentChange(v: string) {
    setSegmentId(v);
    if (v) setClassId('');
  }
  function onClassChange(v: string) {
    setClassId(v);
    if (v) setSegmentId('');
  }

  useEffect(() => {
    if (campaign.status !== 'draft') return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState('idle');
    saveTimer.current = setTimeout(() => {
      doSave();
    }, 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, subject, bodyHtml, classId, segmentId, attachIcs, icsSessionId]);

  function doSave() {
    if (campaign.status !== 'draft') return;
    setSaveState('saving');
    startSaveTransition(async () => {
      const r = await updateCampaign({
        id: campaign.id,
        name,
        subject,
        body_html: bodyHtml,
        template_id: campaign.template_id ?? undefined,
        class_id: classId || undefined,
        segment_id: segmentId || undefined,
        attach_ics: attachIcs,
        ics_session_id: icsSessionId || undefined,
      });
      if (r?.error) {
        toast.error(r.error);
        setSaveState('idle');
      } else {
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 1200);
      }
    });
  }

  function onTestSend() {
    if (campaign.status !== 'draft') return;
    if (!myEmail) {
      toast.error('Could not determine your email address.');
      return;
    }
    startTestTransition(async () => {
      await updateCampaign({
        id: campaign.id,
        name,
        subject,
        body_html: bodyHtml,
        template_id: campaign.template_id ?? undefined,
        class_id: classId || undefined,
        segment_id: segmentId || undefined,
        attach_ics: attachIcs,
        ics_session_id: icsSessionId || undefined,
      });
      const r = await sendTestEmail({
        campaign_id: campaign.id,
        to_email: myEmail,
      });
      if (r?.error) toast.error(r.error);
      else toast.success(`Test sent to ${myEmail}`);
    });
  }

  function onSend() {
    if (campaign.status !== 'draft' && campaign.status !== 'failed') return;
    if (
      !confirm(
        'Send this campaign to all matching students? This cannot be undone.'
      )
    )
      return;
    startSendTransition(async () => {
      await updateCampaign({
        id: campaign.id,
        name,
        subject,
        body_html: bodyHtml,
        template_id: campaign.template_id ?? undefined,
        class_id: classId || undefined,
        segment_id: segmentId || undefined,
        attach_ics: attachIcs,
        ics_session_id: icsSessionId || undefined,
      });
      const r = await sendCampaign(campaign.id);
      if (r?.error) {
        toast.error(r.error);
      } else if (r?.success) {
        toast.success(
          `Queued ${r.queued} · sent ${r.sent}${r.failed ? ` · ${r.failed} failed` : ''}`
        );
        window.location.href = `/campaigns/${campaign.id}`;
      }
    });
  }

  function onDelete() {
    if (!confirm('Permanently delete this campaign?')) return;
    startSendTransition(async () => {
      const r = await deleteCampaign(campaign.id);
      if (r?.error) toast.error(r.error);
    });
  }

  const sampleCtx = sampleContext();
  const previewSubject = renderMerge(subject, sampleCtx);
  const previewBody = renderMerge(bodyHtml, sampleCtx);

  const isReadonly =
    campaign.status !== 'draft' && campaign.status !== 'failed';

  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay-600 mb-2">
          {isReadonly ? campaign.status : 'Editing campaign'}
        </p>
        <h1 className="font-display text-4xl tracking-tight">
          {name || 'Untitled'}
        </h1>
        <p className="text-sm text-slate-500 mt-2 h-5">
          {saveState === 'saving' && 'Saving…'}
          {saveState === 'saved' && 'Saved'}
        </p>
      </header>

      {isReadonly ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          This campaign has already been{' '}
          {campaign.status === 'sending' ? 'queued' : campaign.status}. It
          cannot be edited.
        </div>
      ) : null}

      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Campaign name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isReadonly}
              maxLength={120}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="class">Send to a class</Label>
              <Select
                id="class"
                value={classId}
                onChange={(e) => onClassChange(e.target.value)}
                disabled={isReadonly || !!segmentId}
              >
                <option value="">— None —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Students in {c.title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="segment">Or send to a segment</Label>
              <Select
                id="segment"
                value={segmentId}
                onChange={(e) => onSegmentChange(e.target.value)}
                disabled={isReadonly || !!classId}
              >
                <option value="">— None —</option>
                {segments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.member_count})
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <p className="text-xs text-slate-500 -mt-3">
            Pick a class OR a segment. Leave both blank to send to all your
            subscribed students.
          </p>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isReadonly}
              maxLength={200}
              placeholder="What's this email about?"
            />
            <p className="text-xs text-slate-500">
              Use <code>{'{{student.name}}'}</code> etc. for personalisation.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Body</CardTitle>
          <button
            type="button"
            onClick={() => setPreviewing((p) => !p)}
            className="text-sm text-clay-600 hover:text-clay-700 inline-flex items-center gap-1.5"
          >
            <Eye className="h-3.5 w-3.5" />
            {previewing ? 'Edit' : 'Preview'}
          </button>
        </CardHeader>
        <CardContent>
          {previewing ? (
            <div className="space-y-4">
              <div className="bg-cream-200 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Preview subject</p>
                <p className="font-medium text-slate-900">{previewSubject}</p>
              </div>
              <div
                className="prose prose-sm max-w-none border border-cream-300 rounded-lg p-6 bg-white"
                dangerouslySetInnerHTML={{ __html: previewBody }}
              />
              <p className="text-xs text-slate-500">
                Preview uses sample data: Jane / Tuesday Yoga / Tue, 12 May
                2026, 18:00.
              </p>
            </div>
          ) : (
            <RichTextEditor
              value={bodyHtml}
              onChange={setBodyHtml}
              placeholder="Write your email…"
            />
          )}
        </CardContent>
      </Card>

      {classId ? (
        <Card>
          <CardHeader>
            <CardTitle>Calendar attachment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Checkbox
              checked={attachIcs}
              onChange={(e) => setAttachIcs(e.target.checked)}
              disabled={isReadonly}
              label="Attach a calendar invite for a specific session"
            />

            {attachIcs ? (
              sessions.length === 0 ? (
                <p className="text-sm text-slate-600 bg-cream-200 rounded p-3">
                  No upcoming sessions in this class. Save and reload to
                  refresh, or add sessions to the class first.
                </p>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="session">Session</Label>
                  <Select
                    id="session"
                    value={icsSessionId}
                    onChange={(e) => setIcsSessionId(e.target.value)}
                    disabled={isReadonly}
                  >
                    <option value="">Choose a session…</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {formatDateTime(s.starts_at)}
                      </option>
                    ))}
                  </Select>
                </div>
              )
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {!isReadonly ? (
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-cream-300">
          <Button
            type="button"
            variant="primary"
            onClick={onSend}
            loading={isSending}
            disabled={!subject || !bodyHtml.trim()}
          >
            <Send className="h-4 w-4" />
            Send to recipients
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onTestSend}
            loading={isTesting}
          >
            <Beaker className="h-4 w-4" />
            Test send to me
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={doSave}
            disabled={saveState === 'saving'}
          >
            <Save className="h-4 w-4" />
            Save draft
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            className="text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete draft
          </Button>
        </div>
      ) : (
        <div className="pt-4 border-t border-cream-300">
          <Link href={`/campaigns/${campaign.id}`}>
            <Button variant="outline">View campaign</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
