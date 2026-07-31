type GsapInstance = (typeof import("gsap"))["gsap"];
type FlipInstance = (typeof import("gsap/Flip"))["Flip"];

let gsapPromise: Promise<GsapInstance> | null = null;
let flipPromise: Promise<{ gsap: GsapInstance; Flip: FlipInstance }> | null = null;

export function loadGsap() {
  gsapPromise ??= import("gsap").then((module) => module.gsap);
  return gsapPromise;
}

export function loadGsapFlip() {
  flipPromise ??= Promise.all([loadGsap(), import("gsap/Flip")]).then(([gsap, module]) => {
    const { Flip } = module;
    gsap.registerPlugin(Flip);
    return { gsap, Flip };
  });
  return flipPromise;
}
