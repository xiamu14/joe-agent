import { memo } from 'react';

export const Background = memo(function Background() {
  return (
    <div className="pointer-events-none absolute inset-0 bg-[url('/backgrounds/workspace.avif')] bg-cover bg-center" aria-hidden="true" />
  );
});
