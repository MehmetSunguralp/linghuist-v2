'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { AUTH_LOGO_FORM_SRC } from '@/config/auth.constants';
import { authStrings } from '@/config/auth.strings';
import { AuthForgotForm, AuthLoginForm, AuthSignupForm } from '@/components/auth/auth-form-panel-forms';
import type { AuthTabValue } from '@/types/auth.types';
import { cn } from '@/lib/utils';

type AuthFormPanelProps = {
  className?: string;
  defaultTab?: AuthTabValue;
};

type AuthScreen = 'credentials' | 'forgot-password';

export function AuthFormPanel({ className, defaultTab = 'login' }: AuthFormPanelProps) {
  const [screen, setScreen] = React.useState<AuthScreen>('credentials');
  const [tab, setTab] = React.useState<AuthTabValue>(defaultTab);

  const [sharedEmail, setSharedEmail] = React.useState('');
  const [forgotEmailSeed, setForgotEmailSeed] = React.useState('');

  const [apiBusy, setApiBusy] = React.useState(false);

  const modeLocked = apiBusy;

  const welcomeTitle =
    screen === 'forgot-password'
      ? authStrings.forgotTitle
      : tab === 'login'
        ? authStrings.formWelcomeTitle
        : authStrings.formWelcomeTitleSignup;

  const welcomeSubtitle =
    screen === 'forgot-password'
      ? authStrings.forgotSubtitle
      : tab === 'login'
        ? authStrings.formWelcomeSubtitle
        : authStrings.formWelcomeSubtitleSignup;

  function openForgotPassword(email: string) {
    if (modeLocked) return;
    setForgotEmailSeed(email);
    setSharedEmail((prev) => (email.trim() ? email.trim() : prev));
    setScreen('forgot-password');
  }

  function goToCredentials() {
    if (modeLocked) return;
    setScreen('credentials');
  }

  return (
    <div
      className={cn(
        'relative',
        screen === 'credentials' ? 'pb-48 md:pb-0' : 'pb-10 md:pb-0',
        className,
      )}
    >
      <div className="mb-10 flex flex-col items-center text-center">
        <Image
          src={AUTH_LOGO_FORM_SRC}
          alt={authStrings.brandName}
          width={1024}
          height={1024}
          className="mb-8 h-auto w-full max-w-[200px] object-contain md:max-w-[240px]"
          priority
        />
        <h2 className="mb-3 text-3xl font-bold tracking-tight text-on-surface">{welcomeTitle}</h2>
        <p className="max-w-md text-on-surface-variant">{welcomeSubtitle}</p>
      </div>

      {screen === 'forgot-password' ? (
        <div className="space-y-6">
          <AuthForgotForm
            initialEmail={forgotEmailSeed.trim() ? forgotEmailSeed : sharedEmail}
            onSharedEmailChange={setSharedEmail}
            modeLocked={modeLocked}
            apiBusy={apiBusy}
            setApiBusy={setApiBusy}
          />
          <button
            type="button"
            disabled={modeLocked}
            onClick={goToCredentials}
            className="w-full rounded-xl border border-outline-variant/30 py-3 text-sm font-bold text-on-surface-variant transition-colors hover:border-primary-container/40 hover:text-primary-container disabled:opacity-50"
          >
            {authStrings.backToSignIn}
          </button>
        </div>
      ) : (
        <>
          <div className="relative mb-8 flex rounded-xl bg-surface-container-low p-1.5">
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-y-1.5 left-1.5 w-[calc((100%-12px)/2)] rounded-lg bg-primary-container shadow-lg transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                tab === 'signup' && 'translate-x-full',
              )}
            />
            <button
              type="button"
              disabled={modeLocked}
              onClick={() => setTab('login')}
              className={cn(
                'relative z-10 flex-1 rounded-lg py-3 text-sm font-bold tracking-wide transition-colors duration-200',
                tab === 'login' ? 'text-on-primary' : 'text-slate-400 hover:text-on-surface',
                modeLocked && tab !== 'login' && 'cursor-not-allowed opacity-60',
              )}
            >
              {authStrings.tabLogin}
            </button>
            <button
              type="button"
              disabled={modeLocked}
              onClick={() => setTab('signup')}
              className={cn(
                'relative z-10 flex-1 rounded-lg py-3 text-sm font-bold tracking-wide transition-colors duration-200',
                tab === 'signup' ? 'text-on-primary' : 'text-slate-400 hover:text-on-surface',
                modeLocked && tab !== 'signup' && 'cursor-not-allowed opacity-60',
              )}
            >
              {authStrings.tabSignUp}
            </button>
          </div>

          {tab === 'login' ? (
            <AuthLoginForm
              sharedEmail={sharedEmail}
              onSharedEmailChange={setSharedEmail}
              modeLocked={modeLocked}
              apiBusy={apiBusy}
              setApiBusy={setApiBusy}
              onForgotPassword={openForgotPassword}
            />
          ) : (
            <AuthSignupForm
              sharedEmail={sharedEmail}
              onSharedEmailChange={setSharedEmail}
              modeLocked={modeLocked}
              apiBusy={apiBusy}
              setApiBusy={setApiBusy}
            />
          )}
        </>
      )}

      <p className="mt-12 text-center text-sm text-outline-variant">
        {authStrings.footerAgreementLead}{' '}
        <Link
          href="/terms"
          className="text-on-surface underline transition-colors hover:text-primary-container"
        >
          {authStrings.termsOfService}
        </Link>{' '}
        {authStrings.and}{' '}
        <Link
          href="/privacy"
          className="text-on-surface underline transition-colors hover:text-primary-container"
        >
          {authStrings.privacyPolicy}
        </Link>
        {authStrings.footerAgreementEnd}
      </p>

      {screen === 'credentials' && (
        <>
          <div className="fixed bottom-24 left-1/2 z-50 w-[calc(100%-3rem)] max-w-lg -translate-x-1/2 md:hidden">
            <div className="flex items-center justify-between rounded-2xl border border-outline-variant/15 bg-surface-container-high/80 p-4 shadow-auth-pwa backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary-container text-on-primary">
                  <span className="material-symbols-outlined !text-xl">language</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold tracking-tight text-on-surface">{authStrings.pwaTitle}</h4>
                  <p className="text-xs text-on-surface-variant">{authStrings.pwaSubtitle}</p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg border border-primary-container/20 bg-surface-container-highest px-4 py-2 text-xs font-bold text-primary-container"
              >
                {authStrings.pwaInstall}
              </button>
            </div>
          </div>

          <nav className="fixed bottom-0 left-0 z-50 flex w-full justify-around bg-[#0B1229]/60 px-4 pt-2 pb-6 shadow-auth-nav backdrop-blur-md md:hidden">
            <button
              type="button"
              disabled={modeLocked}
              onClick={() => setTab('login')}
              className={cn(
                'flex flex-col items-center justify-center rounded-xl px-6 py-2 transition-all active:scale-90',
                tab === 'login'
                  ? 'bg-[#00D4FF] text-[#003642]'
                  : 'text-slate-400 hover:bg-surface-container-low hover:text-[#00D4FF]',
                modeLocked && tab !== 'login' && 'cursor-not-allowed opacity-50',
              )}
            >
              <span
                className={cn(
                  'material-symbols-outlined !text-2xl',
                  tab === 'login' && 'material-symbols-outlined--fill',
                )}
              >
                login
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest">{authStrings.bottomNavLogin}</span>
            </button>
            <button
              type="button"
              disabled={modeLocked}
              onClick={() => setTab('signup')}
              className={cn(
                'flex flex-col items-center justify-center rounded-xl px-6 py-2 transition-all active:scale-90',
                tab === 'signup'
                  ? 'bg-[#00D4FF] text-[#003642]'
                  : 'text-slate-400 hover:bg-surface-container-low hover:text-[#00D4FF]',
                modeLocked && tab !== 'signup' && 'cursor-not-allowed opacity-50',
              )}
            >
              <span
                className={cn(
                  'material-symbols-outlined !text-2xl',
                  tab === 'signup' && 'material-symbols-outlined--fill',
                )}
              >
                person_add
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest">{authStrings.bottomNavSignup}</span>
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
