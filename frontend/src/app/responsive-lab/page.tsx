import React from 'react'
import styles from './responsive.module.css'

export const metadata = {
  title: 'Responsive Lab',
  description: 'Sandbox page to experiment with a repurposable responsive layout.',
}

export default function ResponsiveLabPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Responsive Lab</h1>
        <p className={styles.subtitle}>
          A sandbox layout demonstrating fluid type, flexible grid, and container queries.
        </p>
      </header>

      <section className={styles.section}>
        <div className={styles.grid}>
          {[...Array(9)].map((_, i) => (
            <article key={i} className={styles.card}>
              <h2>Card {i + 1}</h2>
              <p>
                This is a placeholder card. Replace with your components later.
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.split}>
        <div className={styles.panel}>
          <h3>Left Panel</h3>
          <p>
            Demonstrates a responsive split layout that stacks on small screens.
          </p>
        </div>
        <div className={styles.panel}>
          <h3>Right Panel</h3>
          <p>
            Swap content as needed. Panels maintain rhythm and spacing.
          </p>
        </div>
      </section>

      <footer className={styles.footer}>
        <small>Repurpose: copy `responsive.module.css` and this page structure.</small>
      </footer>
    </main>
  )
}
