import {useEffect, useState} from 'react';

export const useKeyboardVisible = () => {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    // Store the initial viewport height
    const initialViewportHeight = window.innerHeight;

    const handleResize = () => {
      // Calculate the difference between initial and current viewport height
      const currentViewportHeight = window.innerHeight;
      const heightDifference = initialViewportHeight - currentViewportHeight;

      // If height difference is greater than 150px, keyboard is likely open
      // This threshold accounts for browser UI changes
      const isKeyboardOpen = heightDifference > 150;

      setIsKeyboardVisible(isKeyboardOpen);
    };

    const handleVisualViewportChange = (event) => {
      const VIEWPORT_VS_CLIENT_HEIGHT_RATIO = 0.75;
      // Modern browsers support Visual Viewport API (better detection)
      if (window.visualViewport) {
        const isKeyboardOpen =
          (event.target.height * event.target.scale) / window.screen.height < VIEWPORT_VS_CLIENT_HEIGHT_RATIO;
        setIsKeyboardVisible(isKeyboardOpen);
      }
    };

    const handleFocusIn = () => {
      // Additional detection: when input fields are focused
      setTimeout(() => {
        const currentViewportHeight = window.innerHeight;
        const heightDifference = initialViewportHeight - currentViewportHeight;
        const isKeyboardOpen = heightDifference > 150;
        setIsKeyboardVisible(isKeyboardOpen);
      }, 300); // Delay to allow keyboard animation
    };

    const handleFocusOut = () => {
      // When input fields lose focus, keyboard might close
      setTimeout(() => {
        const currentViewportHeight = window.innerHeight;
        const heightDifference = initialViewportHeight - currentViewportHeight;
        const isKeyboardOpen = heightDifference > 150;
        setIsKeyboardVisible(isKeyboardOpen);
      }, 300); // Delay to allow keyboard animation
    };

    // Listen for window resize (fallback method)
    // window.addEventListener('resize', handleResize);

    // Listen for visual viewport changes (modern method - works well on iOS)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
    }

    // Listen for focus events on input elements (additional detection)
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
      }
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return isKeyboardVisible;
};
