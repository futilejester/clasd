import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // For embed-mode form pages, we need to allow framing from any origin.
  // Next sets X-Frame-Options: SAMEORIGIN by default which would block
  // third-party sites from embedding our forms.
  const url = request.nextUrl;
  const isEmbedRoute =
    url.pathname.startsWith('/f/') && url.searchParams.get('embed') === '1';
  const isEmbedScript = url.pathname === '/embed.js';

  const response = await updateSession(request);

if (isEmbedRoute || isEmbedScript) {
    response.headers.delete('X-Frame-Options');
    response.headers.delete('Content-Security-Policy');
    response.headers.set(
      'Content-Security-Policy',
      "frame-ancestors *;"
    );
    // CORS for the JS file
    if (isEmbedScript) {
      response.headers.set('Access-Control-Allow-Origin', '*');
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|cal/|u/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
