// Local shims for GSAP dist subpath imports.
// We import runtime plugins from gsap/dist/* to avoid TS casing conflicts on macOS,
// but we still want correct types.

declare module "gsap/dist/Draggable" {
  import Draggable from "gsap/types/draggable";
  export default Draggable;
}

declare module "gsap/dist/InertiaPlugin" {
  import InertiaPlugin from "gsap/types/inertia-plugin";
  export default InertiaPlugin;
}
