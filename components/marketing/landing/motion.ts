import type { Variants } from "framer-motion";

export const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.08 } },
};

export const rise: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: easeOut } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } },
};
