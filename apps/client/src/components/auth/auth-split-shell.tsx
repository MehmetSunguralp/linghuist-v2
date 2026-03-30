import { AuthFormPanel } from '@/components/auth/auth-form-panel';
import { AuthHeroPanel } from '@/components/auth/auth-hero-panel';
import { cn } from '@/lib/utils';

type AuthSplitShellProps = {
  className?: string;
};

/**
 * Server Component: static shell + hero copy/video SSR. Only `AuthFormPanel` is a client island.
 */
export function AuthSplitShell({ className }: AuthSplitShellProps) {
  return (
    <div
      className={cn(
        'dark min-h-dvh bg-surface text-on-surface selection:bg-primary-container selection:text-on-primary',
        className,
      )}
    >
      <main className="flex min-h-dvh flex-col md:flex-row">
        <section className="relative hidden flex-1 items-center justify-center overflow-hidden bg-surface-container-lowest md:flex">
          <div
            className="absolute top-1/4 -left-20 size-96 rounded-full bg-primary-container/10 blur-[120px]"
            aria-hidden
          />
          <div
            className="absolute bottom-1/4 -right-20 size-96 rounded-full bg-secondary-container/10 blur-[120px]"
            aria-hidden
          />
          <AuthHeroPanel className="relative z-10 w-full max-w-[min(92%,44rem)] px-8 py-10 lg:px-12" />
        </section>

        <section className="z-20 flex flex-1 flex-col items-center justify-center bg-surface">
          <AuthFormPanel />
        </section>
      </main>
    </div>
  );
}
