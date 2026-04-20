/* eslint-disable react-refresh/only-export-components */
import { createPortfolioSocialImage, runtime } from "./socialImage";

export { runtime };

export const alt =
  "Bradley Baysinger frontend and UI developer portfolio preview";
export const size = {
  width: 1200,
  height: 600,
};
export const contentType = "image/png";

export default function TwitterImage() {
  return createPortfolioSocialImage(size);
}
