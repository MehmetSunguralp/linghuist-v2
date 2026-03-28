import { AuthFormPanel } from '@/components/auth/auth-form-panel';
import { AuthHeader } from '@/components/auth/auth-header';
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
      <AuthHeader />
      <main className="flex min-h-screen flex-col pt-[72px] md:flex-row">
        <section className="relative hidden flex-1 items-center justify-center overflow-hidden bg-surface-container-lowest md:flex">
          <div className="absolute top-1/4 -left-20 size-96 rounded-full bg-primary-container/10 blur-[120px]" aria-hidden />
          <div className="absolute bottom-1/4 -right-20 size-96 rounded-full bg-secondary-container/10 blur-[120px]" aria-hidden />
          <AuthHeroPanel className="relative z-10 w-full max-w-xl" />
        </section>

        <section className="z-20 flex flex-1 flex-col items-center justify-center bg-surface">
          <AuthFormPanel className="w-full max-w-md" />
        </section>
      </main>
    </div>
  );
}
