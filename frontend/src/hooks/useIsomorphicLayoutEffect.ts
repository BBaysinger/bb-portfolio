import { useEffect, useLayoutEffect } from "react";

/**
 * A hook that uses `useLayoutEffect` in the browser and `useEffect` on the server
 * to prevent React warnings during SSR.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default useIsomorphicLayoutEffect;
