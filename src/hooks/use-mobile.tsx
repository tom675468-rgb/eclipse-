import * as React from "react";

const MOBILE_BREAKPOINT = 768;

function readMobileViewport() {
  if (typeof window === "undefined") return false;
  const screenWidth = Math.min(window.screen.width, window.screen.height);
  const touchPhone = navigator.maxTouchPoints > 0 && screenWidth < MOBILE_BREAKPOINT;
  return touchPhone
    || screenWidth < MOBILE_BREAKPOINT
    || window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches
    || (window.visualViewport?.width ?? window.innerWidth) < MOBILE_BREAKPOINT;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(readMobileViewport);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(readMobileViewport());
    mql.addEventListener("change", onChange);
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    window.visualViewport?.addEventListener("resize", onChange);
    onChange();
    return () => {
      mql.removeEventListener("change", onChange);
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
      window.visualViewport?.removeEventListener("resize", onChange);
    };
  }, []);

  return isMobile;
}
