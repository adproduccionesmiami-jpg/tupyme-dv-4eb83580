import { useEffect, useState } from 'react';
import logoMonocromatico from '@/assets/logo-monocromatico.png';

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

export function SplashScreen({ onComplete, duration = 2000 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Start animation after mount
    const animateTimer = setTimeout(() => setIsAnimating(true), 50);
    
    // Hide and call onComplete after duration
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(animateTimer);
      clearTimeout(hideTimer);
    };
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, hsl(210 65% 15%) 0%, hsl(215 70% 25%) 35%, hsl(200 75% 40%) 70%, hsl(195 80% 50%) 100%)',
      }}
    >
      {/* Subtle pattern overlay */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      
      <div className="flex flex-col items-center gap-6">
        {/* Logo with scale animation */}
        <div 
          className={`transition-all duration-700 ease-out ${
            isAnimating 
              ? 'opacity-100 scale-100' 
              : 'opacity-0 scale-75'
          }`}
        >
          <img 
            src={logoMonocromatico} 
            alt="TuPyme" 
            className="w-32 h-32 sm:w-40 sm:h-40 object-contain drop-shadow-2xl"
          />
        </div>
        
        {/* Text fade in with delay */}
        <div 
          className={`flex flex-col items-center gap-2 transition-all duration-500 delay-300 ${
            isAnimating 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-4'
          }`}
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight drop-shadow-lg">
            TuPyme
          </h1>
          <p className="text-sm sm:text-base text-white/70 font-medium">
            Sistema de Inventario
          </p>
        </div>
        
        {/* Loading indicator */}
        <div 
          className={`mt-4 transition-all duration-500 delay-500 ${
            isAnimating 
              ? 'opacity-100' 
              : 'opacity-0'
          }`}
        >
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
