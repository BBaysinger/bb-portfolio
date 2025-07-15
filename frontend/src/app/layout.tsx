import { ReactNode } from "react";

import { ClientLayoutShell } from "./ClientLayoutShell";
import { AppProviders } from "./providers/AppProviders";

import "bootstrap/dist/css/bootstrap.min.css";
import "@/styles/styles.scss";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <ClientLayoutShell>{children}</ClientLayoutShell>
        </AppProviders>
      </body>
    </html>
  );
}
