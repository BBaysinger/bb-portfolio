import { useEffect, useState, useRef } from "react";
import styles from "./HelloSign.module.scss";

const MAX_ROTATION = 15;

const NeedleTracker = () => {
  const [angle, setAngle] = useState(0);
  const needle = useRef<HTMLDivElement | null>(null);
  const initialAngle = useRef(0); // Stores the initial angle

  useEffect(() => {
    const updateAngle = (e: MouseEvent) => {
      if (!needle.current) return;

      const rect = needle.current.getBoundingClientRect();
      const needleX = rect.left + rect.width / 2;
      const needleY = rect.top + rect.height / 2;

      const dx = e.clientX - needleX;
      const dy = e.clientY - needleY;

      const newAngle = Math.atan2(dx, -dy) * (180 / Math.PI);

      if (initialAngle.current === 0) {
        initialAngle.current = newAngle;
      }

      const minAngle = initialAngle.current - MAX_ROTATION;
      const maxAngle = initialAngle.current + MAX_ROTATION;
      const constrainedAngle = Math.min(maxAngle, Math.max(minAngle, newAngle));

      setAngle(constrainedAngle);
    };

    window.addEventListener("mousemove", updateAngle);
    return () => window.removeEventListener("mousemove", updateAngle);
  }, []);

  return (
    <div
      ref={needle}
      className={styles.needle}
      style={{ transform: `rotate(${angle}deg)` }}
    />
  );
};

export default NeedleTracker;
