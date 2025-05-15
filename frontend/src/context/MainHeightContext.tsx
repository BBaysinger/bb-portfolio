/**
 * MainHeightContext
 *
 * Provides a context for sharing the dynamic height of the main content area across the app.
 * Useful when layout changes or animations require awareness of available vertical space.
 *
 * (I took this out of use, because there's a more direct (non-global) way.)
 *
 * Includes:
 * - `useMainHeight`: consumer hook to read the height
 * - `useSetMainHeight`: consumer hook to update the height
 * - `MainHeightProvider`: wraps children with height context
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */

import React, { createContext, useContext, useState } from "react";

// Context for reading current main content height
const MainHeightContext = createContext<number>(0);

// Context for updating the main content height
const MainHeightSetterContext = createContext<(h: number) => void>(() => {});

// Hook to consume the current main height value
export const useMainHeight = () => useContext(MainHeightContext);

// Hook to consume the setter for updating main height
export const useSetMainHeight = () => useContext(MainHeightSetterContext);

// Provider component to expose height state to any children that need it
export const MainHeightProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [height, setHeight] = useState<number>(0);

  return (
    <MainHeightContext.Provider value={height}>
      <MainHeightSetterContext.Provider value={setHeight}>
        {children}
      </MainHeightSetterContext.Provider>
    </MainHeightContext.Provider>
  );
};
