import { render } from '@react-email/render';
import { EmailShell } from '@/emails/email-shell';

interface RenderArgs {
  bodyHtml: string;
  preview?: string;
  senderName?: string | null;
  unsubscribeUrl?: string;
}

export async function renderEmail(args: RenderArgs): Promise<{
  html: string;
  text: string;
}> {
  const element = (
    <EmailShell
      bodyHtml={args.bodyHtml}
      preview={args.preview}
      senderName={args.senderName}
      unsubscribeUrl={args.unsubscribeUrl}
    />
  );

  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);

  return { html, text };
}
