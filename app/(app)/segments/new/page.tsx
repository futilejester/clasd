import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SegmentEditor } from '../segment-editor';

export default function NewSegmentPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/segments"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to segments
      </Link>

      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-clay-600 mb-2">
          New segment
        </p>
        <h1 className="font-display text-4xl tracking-tight">
          Build a segment
        </h1>
        <p className="text-slate-600 mt-1">
          Save a filter you can reuse for targeted campaigns.
        </p>
      </header>

      <SegmentEditor />
    </div>
  );
}
