import styles from "./DebugOverlay.module.scss";

type DebugOverlayProps = {
  visible: boolean;
  summary: string | null;
  ariaLive?: "off" | "polite" | "assertive";
  className?: string;
};

export default function DebugOverlay({
  visible,
  summary,
  ariaLive = "polite",
  className,
}: DebugOverlayProps) {
  if (!visible || !summary) return null;

  return (
    <div
      className={[styles.debugOverlay, className].filter(Boolean).join(" ")}
      aria-live={ariaLive}
    >
      {summary}
    </div>
  );
}
