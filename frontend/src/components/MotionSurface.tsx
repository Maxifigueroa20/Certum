import type { ReactNode } from "react";
import * as m from "motion/react-m";

type MotionSurfaceProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function MotionSurface({
  children,
  className,
  delay = 0,
}: MotionSurfaceProps) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0.2, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
  );
}
