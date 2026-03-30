'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';

import { cn } from '@/lib/utils';

const Avatar = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn('relative flex size-10 shrink-0 overflow-hidden rounded-full', className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn('aspect-square size-full', className)} {...props} />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex size-full items-center justify-center rounded-full bg-[#2a3150] text-xs font-semibold text-[#dce1ff]',
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

function AvatarBadge({ className, ...props }: Readonly<React.ComponentPropsWithoutRef<'span'>>) {
  return (
    <span
      className={cn(
        'pointer-events-none absolute bottom-0 right-0 z-10 block size-2.5 rounded-full border-2 border-[#181e36] bg-emerald-500',
        className,
      )}
      {...props}
    />
  );
}

const AvatarGroup = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center *:ring-2 *:ring-[#0b1229]', className)} {...props} />
  ),
);
AvatarGroup.displayName = 'AvatarGroup';

function AvatarGroupCount({ className, ...props }: Readonly<React.ComponentPropsWithoutRef<'span'>>) {
  return (
    <span
      className={cn(
        'relative z-0 -ml-2 flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed border-white/25 bg-[#222941] text-xs font-medium text-[#9caec8]',
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage };
