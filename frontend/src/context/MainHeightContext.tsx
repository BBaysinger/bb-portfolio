import React, { createContext, useContext, useState } from "react";

const MainHeightContext = createContext<number | null>(null);
const MainHeightSetterContext = createContext<(h: number) => void>(() => {});

export const useMainHeight = () => useContext(MainHeightContext);
export const useSetMainHeight = () => useContext(MainHeightSetterContext);

export const MainHeightProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [height, setHeight] = useState<number | null>(null);

  return (
    <MainHeightContext.Provider value={height}>
      <MainHeightSetterContext.Provider value={setHeight}>
        {children}
      </MainHeightSetterContext.Provider>
    </MainHeightContext.Provider>
  );
};
