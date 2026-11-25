'use client';

import NextLink from 'next/link';
import { useParams as useNextParams, useRouter } from 'next/navigation';

export function Link({ to, href, children, ...props }: { to?: string; href?: string; children?: React.ReactNode } & Omit<React.ComponentProps<typeof NextLink>, 'href'>) {
  return <NextLink href={(href || to) as string} {...props}>{children}</NextLink>;
}

export function useNavigate() {
  const router = useRouter();
  return (target: string | number, options: { replace?: boolean } = {}) => {
    if (typeof target === 'number') {
      if (target < 0) router.back();
      else router.forward();
      return;
    }
    if (options.replace) router.replace(target);
    else router.push(target);
  };
}

export function useParams() {
  return useNextParams();
}
