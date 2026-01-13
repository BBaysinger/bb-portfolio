/**
 * RawImg
 *
 * Small wrapper around the native `<img>` element.
 * Use this when you explicitly want to bypass Next.js `<Image>` optimizations
 * (e.g., for tiny static assets like icons/logos, or already-optimized files).
 */

import { forwardRef } from "react";
import type { ImgHTMLAttributes } from "react";

type RawImgProps = ImgHTMLAttributes<HTMLImageElement> & {
  alt: string;
};

/**
 * A wrapper around the native <img> tag that bypasses Next.js's
 * <Image> optimizations, intended for static or already optimized assets
 * like logos, icons, or WebP files.
 *
 * This allows consistent use without triggering ESLint warnings.
 *
 * @example
 * ```tsx
 * <RawImg src="/bb-gradient.webp" alt="BB Logo" width={128} height={192} />
 * ```
 */
export const RawImg = forwardRef<HTMLImageElement, RawImgProps>(
  ({ alt, ...rest }, ref) => {
    // Intentionally using a raw `<img>` here to bypass Next.js `<Image>` behavior.
    // Keeping this in one wrapper makes it easy to audit/replace later if needed.
    return <img ref={ref} alt={alt} {...rest} />;
  },
);

RawImg.displayName = "RawImg";
