"use client";

import { useEffect } from "react";

import useQueryParams from "@/hooks/useQueryParams";

type Props = {
  onUpdate: (value: boolean) => void;
};

/**
 * HeroQueryConfig
 *
 * A lightweight Client Component used within the homepage Hero section to safely
 * read the `useSlingerTracking` query parameter on the client side without affecting
 * the SEO or static rendering of the rest of the Hero.
 *
 * This component calls the `onUpdate` callback with the parsed query param value
 * after hydration. It's intended to be rendered inside a `<Suspense>` boundary.
 *
 * Used to toggle optional experimental behavior in the Fluxel grid.
 *
 * @component
 * @param {Props} props
 * @param {(value: boolean) => void} props.onUpdate - Callback fired with the value of `useSlingerTracking`
 * @returns {null} This component renders nothing visibly.
 *
 * @see Hero.tsx
 * @see useQueryParams
 *
 * @author Bradley Baysinger
 * @since 2025
 * @version N/A
 */
export default function HeroQueryConfig({ onUpdate }: Props) {
  const useSlingerTracking = useQueryParams<boolean>(
    "useSlingerTracking",
    false,
  );

  useEffect(() => {
    onUpdate(useSlingerTracking);
  }, [useSlingerTracking, onUpdate]);

  return null;
}
