declare module "payload/types" {
  export type CollectionConfig = any;
  export type BuildConfig = any;
}

declare module "payload/config" {
  import type { BuildConfig } from "payload/types";
  export function buildConfig(config: BuildConfig): BuildConfig;
}
