import React, { forwardRef } from "react";

interface RawImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  alt: string;
}

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
    return <img ref={ref} alt={alt} {...rest} />;
  },
);

RawImg.displayName = "RawImg";
