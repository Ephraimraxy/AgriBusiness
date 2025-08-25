import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface TimerProps {
  initialTime: number; // in seconds
  onTimeUp: () => void;
  isActive: boolean;
}

export default function Timer({ initialTime, onTimeUp, isActive }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimeout(() => onTimeUp(), 0); // Defer the call to avoid setState during render
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLeft, onTimeUp]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const isUrgent = timeLeft <= 300; // Last 5 minutes

  return (
    <div className="text-right">
      <div className={`text-3xl font-bold ${isUrgent ? 'text-red-500' : 'text-slate-700'}`}>
        {formatTime(timeLeft)}
      </div>
      <p className="text-sm text-slate-600 flex items-center justify-end mt-1">
        <Clock className="w-4 h-4 mr-1" />
        Time Remaining
      </p>
      {isUrgent && (
        <p className="text-xs text-red-500 mt-1 animate-pulse">
          Hurry up! Less than 5 minutes left
        </p>
      )}
    </div>
  );
}
