import clsx from "clsx";

import styles from "./ResponsiveLab.module.scss";

export const metadata = {
  title: "Responsive Lab",
  description:
    "Sandbox page to experiment with a repurposable responsive layout.",
};

export default function ResponsiveLabPage() {
  return (
    <div className={clsx(styles.grid, styles.page)}>
      {[...Array(12)].map((_, i) => (
        <article key={i} className={styles.card}>
          <div className={styles.cardBody} />
        </article>
      ))}
    </div>
  );
}
