// components/FullScreenButton.tsx
"use client";

import { useState, useEffect } from "react";

// A simple SVG icon for the button
const FullscreenIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
);

export default function FullScreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // This effect runs on the client and handles the fullscreenchange event
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    // Set the initial state
    setIsFullscreen(!!document.fullscreenElement);

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // Cleanup the event listener on component unmount
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        // Log any errors to the console
        console.error(
          `Error attempting to enable full-screen mode: ${err.message} (${err.name})`
        );
      });
    }
  };

  // If the user is already in fullscreen, the component returns null (it disappears)
  if (isFullscreen) {
    return null;
  }

  return (
    <button
      onClick={handleFullScreen}
      className="top-5 left-5 z-50 fixed bg-white/80 hover:bg-white shadow-lg backdrop-blur-sm p-3 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400 text-black transition-colors"
      aria-label="Enter Fullscreen"
      title="Enter Fullscreen"
    >
      <FullscreenIcon />
    </button>
  );
}
