'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { AUTH_LOGO_FORM_SRC } from '@/config/auth.constants';
import { enStrings } from '@/config/en.strings';
import { AuthForgotForm, AuthLoginForm, AuthSignupForm } from '@/components/auth/auth-form-panel-forms';
import { authResponsive } from '@/components/auth/auth-responsive';
import type { AuthTabValue } from '@/types/auth.types';
import { cn } from '@/lib/utils';
const authStrings = enStrings.auth;
const brandName = enStrings.app.brandName;

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
    <div className={cn('relative', authResponsive.panelWrapper, className)}>
      <div className={cn('flex flex-col items-center text-left', authResponsive.panelTopGap)}>
        <Image
          src={AUTH_LOGO_FORM_SRC}
          alt={brandName}
          width={1024}
          height={1024}
          className={authResponsive.logo}
          priority
        />
        <h2 className={cn('w-full text-left', authResponsive.heading)}>{welcomeTitle}</h2>
        <p className={cn('w-full text-left', authResponsive.subtitle)}>{welcomeSubtitle}</p>
      </div>

      {screen === 'forgot-password' ? (
        <div className={authResponsive.formSpacing}>
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
            className="w-full rounded-xl border border-outline-variant/30 py-[clamp(0.68rem,3.2vw,0.82rem)] text-[clamp(0.72rem,2.9vw,0.82rem)] font-bold uppercase tracking-[0.12em] text-on-surface-variant transition-colors hover:border-primary-container/40 hover:text-primary-container disabled:opacity-50"
          >
            {authStrings.backToSignIn}
          </button>
        </div>
      ) : (
        <>
          <div className={authResponsive.tabsWrap}>
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
                authResponsive.tabButton,
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
                authResponsive.tabButton,
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

      <p className={authResponsive.footer}>
        {authStrings.footerAgreementLead}{' '}
        <Link href="/terms" className="text-on-surface underline transition-colors hover:text-primary-container">
          {authStrings.termsOfService}
        </Link>{' '}
        {authStrings.and}{' '}
        <Link href="/privacy" className="text-on-surface underline transition-colors hover:text-primary-container">
          {authStrings.privacyPolicy}
        </Link>
        {authStrings.footerAgreementEnd}
      </p>
    </div>
  );
}
