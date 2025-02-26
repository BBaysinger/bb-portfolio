import React, { useEffect, useRef, useState } from "react";

/**
 * Giant pixel animations using GIFs.
 *
 * Using GIFs bc I'm having better luck than with WEBP.
 * FFMPEG is corrupting colors horribly.
 *
 * This will eventually rebuilt in PixiJS, along with
 * the fluxel grid, and some of the effects will be interactive.
 *
 * Uses JavaScript to handle background images dynamically,
 * including media query logic for orientation changes.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const PixelAnimations: React.FC<{ className: string }> = ({ className }) => {
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastIndexRef = useRef<number>(-1);

  const delay = 12000;
  const initialDelay = 5000;

  const sequence = [
    {
      landscape: "/images/fluxel-animations/interactive.gif",
      portrait: "/images/fluxel-animations/interactive.gif",
      delay: 21000,
    },
    {
      landscape: "/images/fluxel-animations/burst1.gif",
      portrait: "/images/fluxel-animations/burst1.gif",
      delay: 7000,
    },
    {
      landscape: "/images/fluxel-animations/invaders-landscape.gif",
      portrait: "/images/fluxel-animations/invaders-portrait.gif",
      delay: 17000,
    },
    {
      landscape: "/images/fluxel-animations/spiral.gif",
      portrait: "/images/fluxel-animations/spiral.gif",
      delay: 9000,
    },
  ];

  const getRandomIndex = (excludeIndex: number) => {
    let newIndex: number;
    do {
      newIndex = Math.floor(Math.random() * sequence.length);
    } while (newIndex === excludeIndex);
    return newIndex;
  };

  const updateBackground = () => {
    const isPortrait = window.matchMedia("(orientation: portrait)").matches;
    const nextIndex = getRandomIndex(lastIndexRef.current);
    lastIndexRef.current = nextIndex;

    const imageUrl = isPortrait
      ? sequence[nextIndex].portrait
      : sequence[nextIndex].landscape;

    setBackgroundImage(imageUrl);

    timeoutRef.current = setTimeout(
      updateBackground,
      sequence[nextIndex].delay + delay,
    );
  };

  useEffect(() => {
    timeoutRef.current = setTimeout(updateBackground, initialDelay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className={className}
      style={{
        backgroundImage: `url(${backgroundImage})`,
      }}
    ></div>
  );
};

export default PixelAnimations;
