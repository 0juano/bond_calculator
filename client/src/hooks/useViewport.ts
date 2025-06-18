import { useState, useEffect } from 'react';

export interface ViewportInfo {
  width: number;
  height: number;
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

/**
 * Hook to track viewport dimensions and breakpoints
 * Includes dev-only logging for mobile responsiveness debugging
 */
export const useViewport = (): ViewportInfo => {
  const [viewport, setViewport] = useState<ViewportInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 0,
        height: 0,
        breakpoint: 'lg',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      width,
      height,
      breakpoint: getBreakpoint(width),
      isMobile: width < 640,
      isTablet: width >= 640 && width < 1024,
      isDesktop: width >= 1024,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const breakpoint = getBreakpoint(width);
      
      const newViewport: ViewportInfo = {
        width,
        height,
        breakpoint,
        isMobile: width < 640,
        isTablet: width >= 640 && width < 1024,
        isDesktop: width >= 1024,
      };
      
      setViewport(newViewport);
      
      // Dev-only logging for mobile responsiveness debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`📱 Viewport: ${width}x${height}px (${breakpoint}) - ${newViewport.isMobile ? 'Mobile' : newViewport.isTablet ? 'Tablet' : 'Desktop'}`);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return viewport;
};

/**
 * Determine breakpoint based on width
 * Aligned with Tailwind CSS breakpoints and mobile-first plan
 */
function getBreakpoint(width: number): ViewportInfo['breakpoint'] {
  if (width < 480) return 'xs';      // Extra small phones
  if (width < 640) return 'sm';      // Small phones  
  if (width < 768) return 'md';      // Large phones / small tablets
  if (width < 1024) return 'lg';     // Tablets / small laptops
  if (width < 1280) return 'xl';     // Laptops / desktops
  return '2xl';                      // Large desktops
}

/**
 * Legacy hook for backward compatibility
 * Updates the existing use-mobile.tsx to use new breakpoint system
 */
export const useIsMobile = (): boolean => {
  const { isMobile } = useViewport();
  return isMobile;
};