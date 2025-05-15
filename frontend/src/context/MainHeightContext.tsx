import React, { createContext, useContext, useState } from "react";

const MainHeightContext = createContext<number>(0);
const MainHeightSetterContext = createContext<(h: number) => void>(() => {});

export const useMainHeight = () => useContext(MainHeightContext);
export const useSetMainHeight = () => useContext(MainHeightSetterContext);

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
