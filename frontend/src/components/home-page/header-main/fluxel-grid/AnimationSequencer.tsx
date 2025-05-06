import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";

import styles from "./AnimationSequencer.module.scss";

export interface AnimationSequencerHandle {
  fadeOut: () => void;
  playImperativeAnimation: (index?: number) => void;
}

/**
 * Giant pixel animations using video.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const AnimationSequencer = forwardRef<
  AnimationSequencerHandle,
  { className: string }
>(({ className }, ref) => {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isFading, setIsFading] = useState(false);
  const [_key, setKey] = useState(0); // used to reset video element
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queueRef = useRef<number[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const delay = 16000;
  const initialDelay = 3000;
  const ratio = 40 / 33;
  const directory = "/video/fluxel-animations/";

  const inactivityAnimations = [
    {
      wide: "interactive-web.webm",
      narrow: "interactive-web.webm",
    },
    {
      wide: "javascript-typescript.webm",
      narrow: "javascript-typescript.webm",
    },
    {
      wide: "responsive-design.webm",
      narrow: "responsive-design.webm",
    },
    {
      wide: "single-page-applications.webm",
      narrow: "single-page-applications.webm",
    },
  ];

  const imperativeAnimations = [
    {
      wide: "burst1.webm",
      narrow: "burst1.webm",
    },
    {
      wide: "invaders-wide.webm",
      narrow: "invaders-narrow.webm",
    },
    {
      wide: "spiral.webm",
      narrow: "spiral.webm",
    },
  ];

  const shuffleArray = (array: number[]) =>
    array.sort(() => Math.random() - 0.5);

  useEffect(() => {
    if (videoRef.current && videoSrc) {
      videoRef.current.load();
      videoRef.current.play().catch((err) => {
        if (err.name === "AbortError") {
          console.warn("Video play() was aborted by the browser:", err.message);
        } else {
          console.error("Video play() error:", err);
        }
      });
    }

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        videoRef.current &&
        videoSrc
      ) {
        videoRef.current
          .play()
          .then(() => {
            console.log("Resumed video playback after tab became visible.");
          })
          .catch((err) => {
            if (err.name === "AbortError") {
              console.warn("Video play() aborted due to browser policy.");
            } else {
              console.error("Error resuming video playback:", err);
            }
          });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [videoSrc]);

  const getNextIndex = () => {
    if (queueRef.current.length === 0) {
      queueRef.current = shuffleArray([
        ...Array(inactivityAnimations.length).keys(),
      ]);
    }
    return queueRef.current.shift()!;
  };

  const updateVideo = () => {
    const aspect = window.innerWidth / window.innerHeight;
    const nextIndex = getNextIndex();
    const anim = inactivityAnimations[nextIndex];
    const filename = aspect < ratio ? anim.narrow : anim.wide;
    console.log("updateVideo:", filename);

    // Set the video source
    setVideoSrc(directory + filename);
    setKey((prev) => prev + 1);

    // Set timeout to clear the video and schedule the next one
    timeoutRef.current = setTimeout(() => {
      setVideoSrc(null);

      // Small pause, then play the next animation
      // timeoutRef.current = setTimeout(() => {
      //   updateVideo();
      // }, delay);
    }, delay);
  };

  const fadeOut = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsFading(true);
    setTimeout(() => {
      setVideoSrc(null);
      setIsFading(false);
    }, 1000); // CSS fade-out duration
  };

  const playImperativeAnimation = (index = 0) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const aspect = window.innerWidth / window.innerHeight;
    const anim = imperativeAnimations[index % imperativeAnimations.length];
    const filename = aspect < ratio ? anim.narrow : anim.wide;
    console.log("Playing imperative animation:", filename);
    setVideoSrc(directory + filename);
    setKey((prev) => prev + 1);

    timeoutRef.current = setTimeout(() => {
      setVideoSrc(null);

      // Schedule next animation after a pause
      // timeoutRef.current = setTimeout(updateVideo, delay);
    }, delay);
  };

  useImperativeHandle(ref, () => ({
    fadeOut,
    playImperativeAnimation,
  }));

  useEffect(() => {
    timeoutRef.current = setTimeout(updateVideo, initialDelay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleVideoEnded = () => {
    console.log("Video ended");
    timeoutRef.current = setTimeout(() => {
      updateVideo(); // Show the next one
    }, delay);
  };

  const handleVideoError = (
    e: React.SyntheticEvent<HTMLVideoElement, Event>,
  ) => {
    const target = e.currentTarget;
    const error = target.error;

    if (!error) {
      console.error("Unknown video error occurred.");
      return;
    }

    switch (error.code) {
      case error.MEDIA_ERR_ABORTED:
        console.error("Video playback was aborted.");
        break;
      case error.MEDIA_ERR_NETWORK:
        console.error("A network error caused the video download to fail.");
        break;
      case error.MEDIA_ERR_DECODE:
        console.error(
          "The video playback was aborted due to a corruption or unsupported features.",
        );
        break;
      case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
        console.error(
          "The video format is not supported or the file could not be found.",
        );
        break;
      default:
        console.error("An unknown video error occurred.");
        break;
    }

    // Try to skip to the next animation
    timeoutRef.current = setTimeout(() => {
      updateVideo();
    }, delay);
  };

  return (
    <div
      className={`${styles.animation} ${className} ${isFading ? styles.fadeOut : ""}`}
    >
      {videoSrc && (
        <video
          ref={videoRef}
          src={videoSrc || "null"}
          autoPlay
          muted
          playsInline
          onEnded={handleVideoEnded}
          onError={handleVideoError}
        />
      )}
    </div>
  );
});

export default AnimationSequencer;
