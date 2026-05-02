import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface EmailShellProps {
  preview?: string;
  bodyHtml: string;
  senderName?: string | null;
  unsubscribeUrl?: string;
}

/**
 * Wraps a user-composed body in a clean transactional shell.
 *
 * Note: the bodyHtml is rendered with dangerouslySetInnerHTML. This is fine
 * because the source is the authenticated user themselves — they're the
 * sender of the email, and they're writing HTML for their own students.
 * It is not user-supplied input from a third party.
 */
export function EmailShell({
  preview,
  bodyHtml,
  senderName,
  unsubscribeUrl,
}: EmailShellProps) {
  return (
    <Html>
      <Head />
      {preview ? <Preview>{preview}</Preview> : null}
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={contentStyle}>
            <div
              style={{ color: '#1A1A18', fontSize: 16, lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          </Section>

          <Hr style={hrStyle} />

          <Section style={footerStyle}>
            <Text style={footerText}>
              Sent by{' '}
              <span style={{ color: '#33332F' }}>
                {senderName || 'your instructor'}
              </span>
              {' '}via Clasd.
            </Text>
            {unsubscribeUrl ? (
              <Text style={footerText}>
                Don&apos;t want these emails?{' '}
                <a href={unsubscribeUrl} style={linkStyle}>
                  Unsubscribe
                </a>
              </Text>
            ) : null}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle: React.CSSProperties = {
  backgroundColor: '#FAF7F2',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
  margin: 0,
  padding: '32px 16px',
};

const containerStyle: React.CSSProperties = {
  backgroundColor: '#FDFBF7',
  border: '1px solid #E8DFCF',
  borderRadius: 8,
  margin: '0 auto',
  maxWidth: 560,
  padding: 0,
};

const contentStyle: React.CSSProperties = {
  padding: '32px 28px 16px 28px',
};

const hrStyle: React.CSSProperties = {
  borderColor: '#E8DFCF',
  margin: '0 28px',
};

const footerStyle: React.CSSProperties = {
  padding: '16px 28px 24px 28px',
};

const footerText: React.CSSProperties = {
  color: '#66665F',
  fontSize: 12,
  lineHeight: 1.5,
  margin: '0 0 4px 0',
};

const linkStyle: React.CSSProperties = {
  color: '#B85C38',
  textDecoration: 'underline',
};
