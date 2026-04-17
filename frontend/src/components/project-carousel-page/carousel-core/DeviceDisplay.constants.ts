export const DeviceTypes = {
  LAPTOP: "laptop",
  PHONE: "phone",
} as const;

export type DeviceType = (typeof DeviceTypes)[keyof typeof DeviceTypes];
