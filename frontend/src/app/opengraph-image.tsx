/* eslint-disable react-refresh/only-export-components */
import { createPortfolioSocialImage } from "./socialImageBrowser";

export const runtime = "nodejs";

export const alt =
  "Bradley Baysinger frontend and UI developer portfolio preview";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return createPortfolioSocialImage(size);
}
