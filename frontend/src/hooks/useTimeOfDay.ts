import { useEffect, useState } from "react";

/**
 *
 *
 * @author Bradley Baysinger
 * @since 2025
 * @version N/A
 */
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

    return () => clearInterval(interval);
  }, []);

  return timeOfDay;
}

export default useTimeOfDay;
