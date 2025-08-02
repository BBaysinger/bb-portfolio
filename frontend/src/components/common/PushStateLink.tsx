'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface PushStateLinkProps {
  /** The destination URL */
  href: string;
  /** Content inside the link */
  children: React.ReactNode;
  /** Optional CSS class for styling */
  className?: string;
  /** Optional callback to run after navigation */
  onNavigate?: () => void;
}

/**
 * PushStateLink is a hybrid link component that behaves differently
 * on the server vs. the client:
 *
 * - On the server, it renders a Next.js `<Link>` to support static rendering, SEO, and prefetching.
 * - On the client, it renders a plain `<a>` tag and uses `window.history.pushState`
 *   to update the URL without triggering a full page reload or rerender.
 *
 * This is useful for light-weight UI state transitions like filters, tabs, carousels, or query updates
 * where you want URL changes without Next.js routing overhead.
 *
 * @component
 * @example
 * ```tsx
 * <PushStateLink href="/projects?filter=featured" onNavigate={() => setFilter('featured')}>
 *   Featured Projects
 * </PushStateLink>
 * ```
 * 
 * @author Bradley Baysinger
 * @since 2025
 * @version N/A
 */
export function PushStateLink({
  href,
  children,
  className,
  onNavigate,
}: PushStateLinkProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Server: Render Next.js <Link> for static optimization
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  // Client: Use pushState to update URL without navigation
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    if (window.location.pathname !== href) {
      window.history.pushState(null, '', href);
      onNavigate?.();
    }
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
