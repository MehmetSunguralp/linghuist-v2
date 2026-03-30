'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

import { cn } from '@/lib/utils';

const thumbClassName =
  'block size-4 cursor-grab rounded-full border-2 border-[#00d4ff] bg-[#0b1229] shadow-md ring-offset-[#0b1229] transition-colors hover:border-[#5ce8ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d4ff]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1229] active:cursor-grabbing disabled:pointer-events-none disabled:opacity-50';

const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, value, defaultValue, ...props }, ref) => {
  const range = (value?.length ?? defaultValue?.length ?? 1) >= 2;

  return (
    <SliderPrimitive.Root
      ref={ref}
      value={value}
      defaultValue={defaultValue}
      className={cn('relative flex w-full touch-none select-none items-center', className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-white/10">
        <SliderPrimitive.Range className="absolute h-full bg-[#00d4ff]" />
      </SliderPrimitive.Track>
      {range ? (
        <>
          <SliderPrimitive.Thumb className={thumbClassName} />
          <SliderPrimitive.Thumb className={thumbClassName} />
        </>
      ) : (
        <SliderPrimitive.Thumb className={thumbClassName} />
      )}
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
