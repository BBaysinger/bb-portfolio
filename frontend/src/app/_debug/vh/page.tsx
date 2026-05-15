import type { Metadata } from "next";

import ViewportDebugRoute from "@/components/debug/ViewportDebugRoute";

export const metadata: Metadata = {
  title: "Viewport Debug",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ViewportDebugPage() {
  return <ViewportDebugRoute />;
}
