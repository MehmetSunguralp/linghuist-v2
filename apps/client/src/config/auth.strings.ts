/**
 * Centralized English copy for `/auth`. Replace with locale files when i18n lands.
 */
export const authStrings = {
  metaTitle: 'Linghuist - Join the Pulse',
  metaDescription: 'Join Linghuist and learn languages through real conversation.',

  brandName: 'Linghuist',
  help: 'Help',

  heroTitleLead: 'Unlock the world through',
  heroTitleHighlight: 'genuine conversation',
  heroSubtitle: 'Skip the flashcards. Join the digital lounge where language is lived, not just studied.',

  formWelcomeTitle: 'Welcome Back!',
  formWelcomeSubtitle: 'Step into the kinetic midnight of language learning.',

  formWelcomeTitleSignup: 'Join The Lounge!',
  formWelcomeSubtitleSignup: 'Create an account and start living the language tonight.',

  forgotTitle: 'Reset your password',
  forgotSubtitle: 'Enter your email address. If an account exists, we will send you a link to choose a new password.',
  forgotSubmit: 'Send reset link',
  forgotSending: 'Sending…',
  backToSignIn: 'Back to sign in',

  tabLogin: 'Log In',
  tabSignUp: 'Sign Up',

  labelEmail: 'E-Mail Address',
  labelPassword: 'Password',
  labelConfirmPassword: 'Confirm Password',

  emailPlaceholder: 'name@company.com',
  passwordPlaceholder: '••••••••',

  forgotPassword: 'Forgot?',

  signIn: 'Sign In',
  createAccount: 'Create Account',

  orContinueWith: 'OR CONTINUE WITH',

  continueWithGoogle: 'Google',
  continueWithGitHub: 'GitHub',

  footerAgreementLead: 'By joining, you agree to our',
  termsOfService: 'Terms of Service',
  and: 'and',
  privacyPolicy: 'Privacy Policy',
  footerAgreementEnd: '.',

  pwaTitle: 'Download Linghuist',
  pwaSubtitle: 'The lounge is open 24/7 on iOS & Android.',
  pwaInstall: 'Install',

  bottomNavLogin: 'Log In',
  bottomNavSignup: 'Sign Up',

  passwordRulesHint: 'At least 8 characters, including one uppercase letter and one special character.',

  errorPasswordMismatch: 'Passwords do not match.',
  errorUnexpected: 'Something went wrong. Please try again.',
  errorServerNotConfigured: 'Server URL is not configured for this app.',

  signingIn: 'Signing In…',
  creatingAccount: 'Creating Account…',

  toastInvalidCredentials: 'Check your email and password and try again.',
  toastEmailVerificationSent: 'Verification email sent. Check your inbox to confirm your account.',
  toastPasswordResetSent: 'If an account exists for that email, we sent a password reset link. Check your inbox.',

  /** Client validation (mirrors Nest `class-validator` on auth DTOs). */
  validationEmailInvalid: 'Enter a valid email address.',
  validationPasswordRequired: 'Password is required.',
  /** Matches `SignupDto`: `@MinLength(8)` + `@Matches` message. */
  validationPasswordSignup: 'Password must contain 1 uppercase and 1 special character (minimum 8 characters).',
  validationConfirmPasswordRequired: 'Confirm your password.',
  validationConfirmPasswordMatch: 'Passwords must match.',
} as const;
