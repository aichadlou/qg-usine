// @types/react 19 + react-three-fiber 8: declares the <primitive> element so `npx tsc --noEmit` stays clean.
import "react";
declare module "react" { namespace JSX { interface IntrinsicElements { primitive: any; } } }
declare global { namespace JSX { interface IntrinsicElements { primitive: any; } } }
export {};
