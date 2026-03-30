'use client';

import * as React from 'react';

function isPwaStandalone(): boolean {
  if (typeof globalThis.window === 'undefined') return false;
  if (globalThis.window.matchMedia('(display-mode: standalone)').matches) return true;
  return Boolean((globalThis.navigator as Navigator & { standalone?: boolean }).standalone);
}

/**
 * iOS/Android PWAs often zoom inputs below 16px text; lock viewport scale only in standalone display mode.
 */
export function PwaViewportNoZoom() {
  React.useEffect(() => {
    if (!isPwaStandalone()) return;

    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;

    const previous = meta.getAttribute('content') ?? '';
    meta.setAttribute(
      'content',
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
    );

    return () => {
      if (previous) meta.setAttribute('content', previous);
      else meta.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
    };
  }, []);

  return null;
}
