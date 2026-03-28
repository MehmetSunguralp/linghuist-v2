import { authStrings } from '@/config/auth.strings';
import { AUTH_HERO_VIDEO_URL } from '@/config/auth.constants';
import { cn } from '@/lib/utils';

type AuthHeroPanelProps = {
  className?: string;
};

export function AuthHeroPanel({ className }: AuthHeroPanelProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      <h1 className="mb-8 text-5xl font-extrabold leading-[1.1] tracking-tighter text-on-surface lg:text-7xl">
        {authStrings.heroTitleLead}{' '}
        <span className="text-primary-container">{authStrings.heroTitleHighlight}</span>
      </h1>

      <p className="mb-12 max-w-md text-lg leading-relaxed text-on-surface-variant">
        {authStrings.heroSubtitle}
      </p>

      <div className="relative w-full">
        <div className="relative aspect-video w-full overflow-hidden rounded-3xl shadow-auth-video ring-1 ring-white/5">
          <video
            className="absolute inset-0 size-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            aria-label={authStrings.heroTitleHighlight}
          >
            <source src={AUTH_HERO_VIDEO_URL} type="video/mp4" />
          </video>
        </div>
      </div>
    </div>
  );
}
