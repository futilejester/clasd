'use client';

import { useState, useTransition } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function DangerZone({ userEmail }: { userEmail: string }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isPending, startTransition] = useTransition();

  function onDelete() {
    if (confirmEmail.toLowerCase().trim() !== userEmail.toLowerCase()) {
      toast.error('Email confirmation does not match.');
      return;
    }
    if (
      !confirm(
        'Last chance — this will permanently delete your account, all your students, classes, campaigns, segments, and history. There is no undo. Continue?'
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm_email: confirmEmail }),
      });
      const data = await r.json();
      if (!r.ok) {
        toast.error(data.error ?? 'Could not delete account');
        return;
      }
      // Account is gone — bounce to homepage
      window.location.href = '/?deleted=1';
    });
  }

  return (
    <Card className="border-red-200 bg-red-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="h-5 w-5" />
          Danger zone
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-700">
          Permanently delete your account and all data. This cannot be undone.
        </p>

        {!showConfirm ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowConfirm(true)}
            className="text-red-700 hover:bg-red-100 border border-red-200"
          >
            Delete account
          </Button>
        ) : (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-slate-700">
              Type your email <strong>{userEmail}</strong> to confirm.
            </p>
            <div className="space-y-2">
              <Label htmlFor="confirm-email" className="sr-only">
                Confirm email
              </Label>
              <Input
                id="confirm-email"
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={userEmail}
                autoComplete="off"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={onDelete}
                loading={isPending}
                disabled={
                  confirmEmail.toLowerCase().trim() !==
                  userEmail.toLowerCase()
                }
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Permanently delete account
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowConfirm(false);
                  setConfirmEmail('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
