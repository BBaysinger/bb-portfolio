import type { Metadata } from "next";

import ViewportBorderProbeRoute from "@/components/debug/ViewportBorderProbeRoute";

export const metadata: Metadata = {
  title: "Viewport Border Probe",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ViewportBorderProbePage() {
  return <ViewportBorderProbeRoute />;
}
