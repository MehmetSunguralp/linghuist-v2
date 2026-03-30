'use client';

import * as React from 'react';
import { useFormik } from 'formik';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';

import { AUTH_POST_LOGIN_PATH } from '@/config/auth.constants';
import { authStrings } from '@/config/auth.strings';
import { authResponsive } from '@/components/auth/auth-responsive';
import { isLoginEnvelope, messageFromUnknownError, postAuthAction, postRequestPasswordReset } from '@/lib/auth-api';
import {
  loginValidationSchema,
  requestPasswordResetValidationSchema,
  signupValidationSchema,
} from '@/lib/validation/auth-schemas';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

const fieldClass = authResponsive.fieldInput;
const labelClass = authResponsive.label;
const submitButtonClass = authResponsive.submitButton;

function AuthFieldWithIcon({
  icon: Icon,
  className,
  error,
  touched,
  ...inputProps
}: React.ComponentProps<'input'> & {
  icon: LucideIcon;
  error?: string;
  touched?: boolean;
}) {
  const showWarning = Boolean(touched && error);
  const errorId = inputProps.id ? `${inputProps.id}-validation` : undefined;

  return (
    <div className={authResponsive.fieldSpacing}>
      <div className="relative">
        <Icon
          className={cn(
            authResponsive.fieldIcon,
            showWarning ? 'text-amber-400/90' : 'text-on-surface-variant',
          )}
          aria-hidden
          strokeWidth={2}
        />
        <input
          {...inputProps}
          aria-invalid={showWarning}
          aria-describedby={showWarning ? errorId : undefined}
          className={cn(
            fieldClass,
            'pl-11',
            showWarning && 'ring-2 ring-amber-500/45 focus:ring-amber-500/55',
            className,
          )}
        />
      </div>
      {showWarning && (
        <p id={errorId} className={authResponsive.helperText} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type BusySetter = (busy: boolean) => void;

function mergeEmailChange(
  e: React.ChangeEvent<HTMLInputElement>,
  formik: { handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void },
  onSharedEmailChange: (v: string) => void,
) {
  formik.handleChange(e);
  if (e.target.name === 'email') {
    onSharedEmailChange(e.target.value);
  }
}

type AuthLoginFormProps = {
  sharedEmail: string;
  onSharedEmailChange: (v: string) => void;
  modeLocked: boolean;
  apiBusy: boolean;
  setApiBusy: BusySetter;
  onForgotPassword: (email: string) => void;
};

export function AuthLoginForm({
  sharedEmail,
  onSharedEmailChange,
  modeLocked,
  apiBusy,
  setApiBusy,
  onForgotPassword,
}: AuthLoginFormProps) {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const formik = useFormik({
    initialValues: { email: sharedEmail, password: '' },
    validationSchema: loginValidationSchema,
    validateOnMount: true,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values) => {
      setApiBusy(true);
      try {
        const email = values.email.trim();
        const { ok, json, status } = await postAuthAction('login', {
          email,
          password: values.password,
        });
        if (ok && isLoginEnvelope(json)) {
          setSession(json.data);
          router.push(AUTH_POST_LOGIN_PATH);
          router.refresh();
          return;
        }
        if (status === 401) {
          toast.warning(authStrings.toastInvalidCredentials);
          return;
        }
        const errMsg = messageFromUnknownError(json);
        if (errMsg === 'SERVER_URL is not configured' || errMsg.includes('not configured')) {
          toast.error(authStrings.errorServerNotConfigured);
          return;
        }
        toast.error(errMsg);
      } catch {
        toast.error(authStrings.errorUnexpected);
      } finally {
        setApiBusy(false);
      }
    },
  });

  const disabled = modeLocked || apiBusy || !formik.isValid || formik.isSubmitting;

  return (
    <form onSubmit={formik.handleSubmit} className={authResponsive.formSpacing} noValidate>
      <div className={authResponsive.fieldSpacing}>
        <label htmlFor="auth-login-email" className={labelClass}>
          {authStrings.labelEmail}
        </label>
        <AuthFieldWithIcon
          icon={Mail}
          id="auth-login-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={authStrings.emailPlaceholder}
          value={formik.values.email}
          onChange={(e) => mergeEmailChange(e, formik, onSharedEmailChange)}
          onBlur={formik.handleBlur}
          error={formik.errors.email}
          touched={formik.touched.email}
          disabled={modeLocked || apiBusy}
        />
      </div>
      <div className={authResponsive.fieldSpacing}>
        <div className="ml-1 flex items-center justify-between">
          <label htmlFor="auth-login-password" className={labelClass}>
            {authStrings.labelPassword}
          </label>
          <button
            type="button"
            disabled={modeLocked || apiBusy}
            onClick={() => onForgotPassword(formik.values.email.trim())}
            className={cn(authResponsive.secondaryAction, 'hover:underline disabled:cursor-not-allowed disabled:opacity-50')}
          >
            {authStrings.forgotPassword}
          </button>
        </div>
        <AuthFieldWithIcon
          icon={Lock}
          id="auth-login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder={authStrings.passwordPlaceholder}
          value={formik.values.password}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.errors.password}
          touched={formik.touched.password}
          disabled={modeLocked || apiBusy}
        />
      </div>
      <button type="submit" disabled={disabled} className={submitButtonClass}>
        {apiBusy ? authStrings.signingIn : authStrings.signIn}
      </button>
    </form>
  );
}

type AuthSignupFormProps = {
  sharedEmail: string;
  onSharedEmailChange: (v: string) => void;
  modeLocked: boolean;
  apiBusy: boolean;
  setApiBusy: BusySetter;
};

export function AuthSignupForm({
  sharedEmail,
  onSharedEmailChange,
  modeLocked,
  apiBusy,
  setApiBusy,
}: AuthSignupFormProps) {
  const formik = useFormik({
    initialValues: { email: sharedEmail, password: '', confirmPassword: '' },
    validationSchema: signupValidationSchema,
    validateOnMount: true,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values) => {
      setApiBusy(true);
      try {
        const { ok, json } = await postAuthAction('signup', {
          email: values.email.trim(),
          password: values.password,
          confirmPassword: values.confirmPassword,
        });
        if (
          ok &&
          typeof json === 'object' &&
          json !== null &&
          typeof (json as { message?: unknown }).message === 'string'
        ) {
          toast.warning(authStrings.toastEmailVerificationSent);
          return;
        }
        const msg = messageFromUnknownError(json);
        if (msg === 'SERVER_URL is not configured' || msg.includes('not configured')) {
          toast.error(authStrings.errorServerNotConfigured);
          return;
        }
        toast.error(msg);
      } catch {
        toast.error(authStrings.errorUnexpected);
      } finally {
        setApiBusy(false);
      }
    },
  });

  const disabled = modeLocked || apiBusy || !formik.isValid || formik.isSubmitting;

  return (
    <form onSubmit={formik.handleSubmit} className={authResponsive.formSpacing} noValidate>
      <div className={authResponsive.fieldSpacing}>
        <label htmlFor="auth-signup-email" className={labelClass}>
          {authStrings.labelEmail}
        </label>
        <AuthFieldWithIcon
          icon={Mail}
          id="auth-signup-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={authStrings.emailPlaceholder}
          value={formik.values.email}
          onChange={(e) => mergeEmailChange(e, formik, onSharedEmailChange)}
          onBlur={formik.handleBlur}
          error={formik.errors.email}
          touched={formik.touched.email}
          disabled={modeLocked || apiBusy}
        />
      </div>
      <div className={authResponsive.fieldSpacing}>
        <label htmlFor="auth-signup-password" className={labelClass}>
          {authStrings.labelPassword}
        </label>
        <AuthFieldWithIcon
          icon={Lock}
          id="auth-signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder={authStrings.passwordPlaceholder}
          title={authStrings.passwordRulesHint}
          value={formik.values.password}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.errors.password}
          touched={formik.touched.password}
          disabled={modeLocked || apiBusy}
        />
      </div>
      <div className={authResponsive.fieldSpacing}>
        <label htmlFor="auth-signup-confirm" className={labelClass}>
          {authStrings.labelConfirmPassword}
        </label>
        <AuthFieldWithIcon
          icon={Lock}
          id="auth-signup-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder={authStrings.passwordPlaceholder}
          title={authStrings.passwordRulesHint}
          value={formik.values.confirmPassword}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.errors.confirmPassword}
          touched={formik.touched.confirmPassword}
          disabled={modeLocked || apiBusy}
        />
      </div>
      <button type="submit" disabled={disabled} className={submitButtonClass}>
        {apiBusy ? authStrings.creatingAccount : authStrings.createAccount}
      </button>
    </form>
  );
}

type AuthForgotFormProps = {
  initialEmail: string;
  onSharedEmailChange: (v: string) => void;
  modeLocked: boolean;
  apiBusy: boolean;
  setApiBusy: BusySetter;
};

export function AuthForgotForm({
  initialEmail,
  onSharedEmailChange,
  modeLocked,
  apiBusy,
  setApiBusy,
}: AuthForgotFormProps) {
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: { email: initialEmail },
    validationSchema: requestPasswordResetValidationSchema,
    validateOnMount: true,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values) => {
      setApiBusy(true);
      try {
        const { ok, json } = await postRequestPasswordReset({ email: values.email.trim() });
        if (
          ok &&
          typeof json === 'object' &&
          json !== null &&
          typeof (json as { message?: unknown }).message === 'string'
        ) {
          toast.warning(authStrings.toastPasswordResetSent);
          return;
        }
        const msg = messageFromUnknownError(json);
        if (msg === 'SERVER_URL is not configured' || msg.includes('not configured')) {
          toast.error(authStrings.errorServerNotConfigured);
          return;
        }
        toast.error(msg);
      } catch {
        toast.error(authStrings.errorUnexpected);
      } finally {
        setApiBusy(false);
      }
    },
  });

  const disabled = modeLocked || apiBusy || !formik.isValid || formik.isSubmitting;

  return (
    <form onSubmit={formik.handleSubmit} className={authResponsive.formSpacing} noValidate>
      <div className={authResponsive.fieldSpacing}>
        <label htmlFor="auth-reset-email" className={labelClass}>
          {authStrings.labelEmail}
        </label>
        <AuthFieldWithIcon
          icon={Mail}
          id="auth-reset-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={authStrings.emailPlaceholder}
          value={formik.values.email}
          onChange={(e) => mergeEmailChange(e, formik, onSharedEmailChange)}
          onBlur={formik.handleBlur}
          error={formik.errors.email}
          touched={formik.touched.email}
          disabled={modeLocked || apiBusy}
        />
      </div>
      <button type="submit" disabled={disabled} className={submitButtonClass}>
        {apiBusy ? authStrings.forgotSending : authStrings.forgotSubmit}
      </button>
    </form>
  );
}
