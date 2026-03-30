import type { Metadata } from 'next';
import Link from 'next/link';

/** Public landing; inherits `metadata.template` from the root layout for the document title. */
export const metadata: Metadata = {
  title: 'Home',
};

/** Server Component (default for `page.tsx`). */
export default function Index() {
  /*
   * Replace the elements below with your own.
   *
   * Note: The corresponding styles are in the ./index.tailwind file.
   */
  return (
    <div
      style={{
        width: '100%',
        height: '100dvh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Link href="/auth" className="text-blue-500">
        Auth Page
      </Link>
    </div>
  );
}
