import { useEffect, useState, useCallback } from "react";

type FitMode = "cover" | "contain";

interface ScalerOutput {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}

/**
 * useResponsiveScaler
 *
 * Calculates the dimensions and position of a fixed-aspect-ratio
 * element, scaled responsively to the viewport.
 * Automatically applies CSS variables to a given DOM element.
 *
 * @param aspectRatio width / height (default 4 / 3)
 * @param baseWidth logical width of unscaled layout (default 1280)
 * @param mode 'cover' (default) or 'contain'
 * @param elementRef optional ref to apply CSS variables
 */
export default function useResponsiveScaler(
  aspectRatio = 4 / 3,
  baseWidth = 1280,
  mode: FitMode = "cover",
  elementRef?: React.RefObject<HTMLElement | null>,
): ScalerOutput {
  const calculate = useCallback((): ScalerOutput => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return {
        width: 0,
        height: 0,
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      };
    }

    const containerWidth = document.documentElement.clientWidth;
    const containerHeight = document.documentElement.clientHeight;
    const screenAspect = containerWidth / containerHeight;

    let width: number, height: number;

    const useWidth =
      mode === "contain"
        ? screenAspect < aspectRatio
        : screenAspect > aspectRatio;

    if (useWidth) {
      width = containerWidth;
      height = width / aspectRatio;
    } else {
      height = containerHeight;
      width = height * aspectRatio;
    }

    const offsetX = (containerWidth - width) / 2;
    const offsetY = (containerHeight - height) / 2;
    const scale = width / baseWidth;

    return { width, height, offsetX, offsetY, scale };
  }, [aspectRatio, baseWidth, mode]);

  const [scaler, setScaler] = useState<ScalerOutput>(calculate);

  useEffect(() => {
    const applyCssVars = (el: HTMLElement, data: ScalerOutput) => {
      el.style.setProperty("--responsive-scaler-width", `${data.width}px`);
      el.style.setProperty("--responsive-scaler-height", `${data.height}px`);
      el.style.setProperty("--responsive-scaler-offset-x", `${data.offsetX}px`);
      el.style.setProperty("--responsive-scaler-offset-y", `${data.offsetY}px`);
      el.style.setProperty("--responsive-scaler-scale", `${data.scale}`);
    };

    const onResize = () => {
      const newScaler = calculate();
      setScaler(newScaler);
      if (elementRef?.current) {
        applyCssVars(elementRef.current, newScaler);
      }
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    onResize();

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [calculate, elementRef]);

  return scaler;
}
