import { Roboto, Exo_2 } from "next/font/google";

export const roboto = Roboto({
  weight: ["100", "300", "400", "500", "700", "900"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

export const exo2 = Exo_2({
  weight: ["300", "400", "600", "700", "800"],
  style: ["normal"],
  subsets: ["latin"],
  display: "swap",
});
