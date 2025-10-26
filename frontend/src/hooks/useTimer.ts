import { useState, useEffect, useRef } from 'react';

interface UseTimerOptions {
  startTime?: Date | string;
  autoStart?: boolean;
  onTick?: (elapsed: number) => void;
}

interface UseTimerReturn {
  elapsed: number;
  isRunning: boolean;
  formattedTime: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export const useTimer = (options: UseTimerOptions = {}): UseTimerReturn => {
  const { startTime, autoStart = false, onTick } = options;
  const [elapsed, setElapsed] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(autoStart);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    if (startTime) {
      const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
      startTimeRef.current = start;
      
      if (autoStart) {
        setIsRunning(true);
      }
    }
  }, [startTime, autoStart]);

  useEffect(() => {
    if (isRunning) {
      const updateElapsed = () => {
        if (startTimeRef.current) {
          const now = new Date();
          const elapsedMs = now.getTime() - startTimeRef.current.getTime();
          const elapsedSeconds = Math.floor(elapsedMs / 1000);
          setElapsed(elapsedSeconds);
          
          if (onTick) {
            onTick(elapsedSeconds);
          }
        }
      };

      // Update immediately
      updateElapsed();

      // Then update every second
      intervalRef.current = setInterval(updateElapsed, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [isRunning, onTick]);

  const start = () => {
    if (!startTimeRef.current) {
      startTimeRef.current = new Date();
    }
    setIsRunning(true);
  };

  const stop = () => {
    setIsRunning(false);
  };

  const reset = () => {
    setIsRunning(false);
    setElapsed(0);
    startTimeRef.current = null;
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const pad = (num: number) => String(num).padStart(2, '0');

    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  };

  return {
    elapsed,
    isRunning,
    formattedTime: formatTime(elapsed),
    start,
    stop,
    reset,
  };
};
