import styles from './responsive.module.css'

export const metadata = {
  title: 'Responsive Lab',
  description: 'Sandbox page to experiment with a repurposable responsive layout.',
}

export default function ResponsiveLabPage() {
  return (
    <div className={styles.grid}>
      {[...Array(12)].map((_, i) => (
        <article key={i} className={styles.card}>
          <div className={styles.cardBody} />
        </article>
      ))}
    </div>
  )
}
