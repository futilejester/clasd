/**
 * Built-in email templates.
 *
 * A "template" here is just a starting body for a campaign — the user
 * picks one in the new-campaign flow and can edit freely from there.
 * They're not enforced; the body is plain HTML stored on the campaign.
 *
 * The actual visual shell (logo, footer, unsubscribe link) is added at
 * render time by `renderEmail()` in lib/email/render.tsx.
 */

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  defaultSubject: string;
  defaultBodyHtml: string;
  /** Whether this template typically attaches a session ICS. */
  suggestIcs: boolean;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'enrolment_confirmation',
    name: 'Enrolment confirmation',
    description: 'Welcome a new student to your class.',
    defaultSubject: 'Welcome to {{class.title}}',
    defaultBodyHtml: `<p>Hi {{student.name}},</p>
<p>Thanks for joining <strong>{{class.title}}</strong>. I'm looking forward to seeing you in class.</p>
<p>You'll find us at: {{class.location}}</p>
<p>If anything changes, just reply to this email.</p>
<p>— {{sender.name}}</p>`,
    suggestIcs: false,
  },
  {
    id: 'class_reminder',
    name: 'Class reminder',
    description: 'A friendly nudge before the next session.',
    defaultSubject: 'See you tomorrow at {{class.title}}',
    defaultBodyHtml: `<p>Hi {{student.name}},</p>
<p>Quick reminder that we're on for <strong>{{session.datetime}}</strong>.</p>
<p>Location: {{class.location}}</p>
<p>See you there.</p>
<p>— {{sender.name}}</p>`,
    suggestIcs: true,
  },
  {
    id: 'homework_recap',
    name: 'Homework / recap',
    description: 'Share notes or homework after a class.',
    defaultSubject: 'Notes from {{class.title}} — {{session.date}}',
    defaultBodyHtml: `<p>Hi {{student.name}},</p>
<p>Thanks for coming today. A few things to take away:</p>
<ul>
<li>Practice point 1</li>
<li>Practice point 2</li>
</ul>
<p>See you next session.</p>
<p>— {{sender.name}}</p>`,
    suggestIcs: false,
  },
  {
    id: 'enrolment_open',
    name: 'Term enrolment open',
    description: "Let people know it's time to sign up for the next term.",
    defaultSubject: 'New term — bookings now open',
    defaultBodyHtml: `<p>Hi {{student.name}},</p>
<p>Bookings are now open for the next term of <strong>{{class.title}}</strong>.</p>
<p>Spaces are limited — let me know if you'd like to keep your slot.</p>
<p>— {{sender.name}}</p>`,
    suggestIcs: false,
  },
  {
    id: 'cancellation',
    name: 'Cancellation notice',
    description: 'Tell students a session is cancelled.',
    defaultSubject: 'Cancelled: {{class.title}} on {{session.date}}',
    defaultBodyHtml: `<p>Hi {{student.name}},</p>
<p>Unfortunately I need to cancel <strong>{{class.title}}</strong> on {{session.datetime}}.</p>
<p>Apologies for the late notice. We'll be back at the next session.</p>
<p>— {{sender.name}}</p>`,
    suggestIcs: false,
  },
];

export const BLANK_TEMPLATE: EmailTemplate = {
  id: 'blank',
  name: 'Blank',
  description: 'Start from scratch.',
  defaultSubject: '',
  defaultBodyHtml: '<p></p>',
  suggestIcs: false,
};

export function getTemplate(id: string | null | undefined): EmailTemplate {
  if (!id) return BLANK_TEMPLATE;
  return (
    EMAIL_TEMPLATES.find((t) => t.id === id) ?? BLANK_TEMPLATE
  );
}
