import { useEffect, useState } from "react";

export function useTimeOfDay(): string {
  const getTimeOfDay = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
  };

  const [timeOfDay, setTimeOfDay] = useState(getTimeOfDay);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeOfDay(getTimeOfDay());
    }, 60_000); // check every minute

    return () => clearInterval(interval); // clean up on unmount
  }, []);

  return timeOfDay;
}

export default useTimeOfDay;
