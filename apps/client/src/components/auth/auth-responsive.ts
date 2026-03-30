/**
 * Shared responsive tokens for auth UI.
 * Keep sizing/spacing centralized so future auth-like panels reuse the same behavior.
 */
export const authResponsive = {
  panelWrapper: 'w-full max-w-[28rem] px-4 py-6 sm:px-6 sm:py-8',
  panelTopGap: 'mb-7 sm:mb-9',
  logo: 'mb-6 h-auto w-full max-w-[clamp(8.5rem,40vw,14rem)] object-contain',
  heading: 'mb-2 text-[clamp(1.65rem,7vw,2.35rem)] font-extrabold leading-tight tracking-tight text-on-surface',
  subtitle: 'max-w-md text-[clamp(0.85rem,3.4vw,1rem)] text-on-surface-variant',
  tabsWrap: 'relative mb-6 flex rounded-xl bg-surface-container-low p-1',
  tabButton:
    'relative z-10 flex-1 rounded-lg py-[clamp(0.6rem,2.5vw,0.75rem)] text-[clamp(0.72rem,3vw,0.84rem)] font-bold uppercase tracking-[0.16em] transition-colors duration-200',
  formSpacing: 'space-y-4 sm:space-y-5',
  fieldSpacing: 'space-y-1.5',
  label: 'ml-1 block text-[clamp(0.64rem,2.4vw,0.72rem)] font-bold uppercase tracking-[0.14em] text-on-surface-variant',
  fieldInput:
    'w-full rounded-xl border-none bg-surface-container-highest px-[clamp(0.78rem,3.8vw,1rem)] py-[clamp(0.78rem,3.7vw,1rem)] text-base text-on-surface outline-none transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-primary-container/40',
  fieldIcon: 'pointer-events-none absolute left-3 top-1/2 z-[1] size-[clamp(1rem,4.4vw,1.25rem)] -translate-y-1/2',
  helperText: 'ml-1 text-[clamp(0.68rem,2.5vw,0.76rem)] text-amber-400',
  secondaryAction: 'text-[clamp(0.68rem,2.6vw,0.76rem)] font-bold uppercase tracking-[0.12em] text-primary-container',
  submitButton:
    'w-full rounded-xl bg-primary-container py-[clamp(0.82rem,4.2vw,1rem)] text-[clamp(0.94rem,3.9vw,1.06rem)] font-bold text-on-primary transition-all enabled:hover:shadow-auth-glow-hover enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:shadow-none disabled:focus-visible:ring-0 disabled:focus-visible:shadow-none',
  footer: 'mt-9 text-center text-[clamp(0.7rem,2.7vw,0.82rem)] text-outline-variant',
} as const;
