import { NextRequest, NextResponse } from 'next/server';

const SUPPORTED_LOCALES = new Set(['ar', 'en']);
const DEFAULT_LOCALE = 'ar';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/_next')
    || pathname.startsWith('/api')
    || pathname === '/favicon.ico'
    || pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const [, firstSegment] = pathname.split('/');

  if (SUPPORTED_LOCALES.has(firstSegment)) {
    const strippedPath = pathname.replace(/^\/(ar|en)(?=\/|$)/, '') || '/';
    const rewriteUrl = req.nextUrl.clone();
    rewriteUrl.pathname = strippedPath;

    const response = NextResponse.rewrite(rewriteUrl);
    response.cookies.set('locale', firstSegment, { path: '/' });
    return response;
  }

  const cookieLocale = req.cookies.get('locale')?.value;
  const locale = cookieLocale && SUPPORTED_LOCALES.has(cookieLocale)
    ? cookieLocale
    : DEFAULT_LOCALE;

  const redirectUrl = req.nextUrl.clone();
  redirectUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};