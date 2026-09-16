import React, { useEffect, useRef } from 'react';
import { CurrentWeatherData } from '../types';
import { getWeatherCondition } from '../utils/weatherCodes';

interface RealisticAtmosphereProps {
  current: CurrentWeatherData;
  enabled?: boolean;
}

export const RealisticAtmosphere: React.FC<RealisticAtmosphereProps> = ({ current, enabled = true }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const condition = getWeatherCondition(current.weatherCode, current.isDay);

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const category = condition.category;
    const isDay = current.isDay;
    const windSpeedFactor = Math.max(1, Math.min(current.windSpeed / 10, 4));

    // Particles array
    interface Particle {
      x: number;
      y: number;
      speedY: number;
      speedX: number;
      size: number;
      opacity: number;
      angle?: number;
      twinkleSpeed?: number;
    }

    const particles: Particle[] = [];
    const count =
      category === 'rain' || category === 'drizzle' || category === 'thunderstorm'
        ? 120
        : category === 'snow'
        ? 75
        : !isDay
        ? 65
        : 35; // sunny dust motes / soft clouds

    for (let i = 0; i < count; i++) {
      if (category === 'rain' || category === 'thunderstorm' || category === 'drizzle') {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          speedY: (category === 'drizzle' ? 6 : 14) + Math.random() * 8,
          speedX: (Math.random() - 0.5) * 2 + windSpeedFactor * 1.5,
          size: category === 'drizzle' ? 12 : 22,
          opacity: 0.2 + Math.random() * 0.35,
        });
      } else if (category === 'snow') {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          speedY: 1 + Math.random() * 2.5,
          speedX: Math.sin(Math.random() * Math.PI) * 1.5 + (windSpeedFactor - 1),
          size: 2 + Math.random() * 3.5,
          opacity: 0.3 + Math.random() * 0.5,
          angle: Math.random() * Math.PI * 2,
        });
      } else if (!isDay) {
        // Stars
        particles.push({
          x: Math.random() * width,
          y: Math.random() * (height * 0.7),
          speedY: 0,
          speedX: 0,
          size: 0.8 + Math.random() * 1.8,
          opacity: 0.2 + Math.random() * 0.7,
          twinkleSpeed: 0.02 + Math.random() * 0.03,
        });
      } else {
        // Soft golden sunlit dust motes / breeze particles
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          speedY: -(0.3 + Math.random() * 0.6),
          speedX: (Math.random() - 0.5) * 0.8 + windSpeedFactor * 0.4,
          size: 2 + Math.random() * 3,
          opacity: 0.15 + Math.random() * 0.25,
        });
      }
    }

    // Lightning state for thunderstorms
    let lightningTimer = 0;
    let isLightning = false;

    let tick = 0;

    const render = () => {
      tick++;
      ctx.clearRect(0, 0, width, height);

      // Thunderstorm lightning flashes
      if (category === 'thunderstorm') {
        lightningTimer++;
        if (lightningTimer > 180 && Math.random() < 0.02) {
          isLightning = true;
          lightningTimer = 0;
          setTimeout(() => {
            isLightning = false;
          }, 80);
        }

        if (isLightning) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.fillRect(0, 0, width, height);
        }
      }

      // Render weather particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (category === 'rain' || category === 'thunderstorm' || category === 'drizzle') {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.speedX * 1.2, p.y + p.size);
          ctx.strokeStyle = isDay
            ? `rgba(120, 160, 210, ${p.opacity})`
            : `rgba(180, 210, 255, ${p.opacity * 0.8})`;
          ctx.lineWidth = category === 'drizzle' ? 1 : 1.6;
          ctx.lineCap = 'round';
          ctx.stroke();

          p.y += p.speedY;
          p.x += p.speedX;

          if (p.y > height) {
            p.y = -p.size;
            p.x = Math.random() * width;
          }
          if (p.x > width) p.x = 0;
          if (p.x < 0) p.x = width;
        } else if (category === 'snow') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
          ctx.shadowBlur = 4;
          ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
          ctx.fill();
          ctx.shadowBlur = 0;

          p.angle = (p.angle || 0) + 0.02;
          p.y += p.speedY;
          p.x += p.speedX + Math.sin(p.angle) * 0.6;

          if (p.y > height) {
            p.y = -p.size;
            p.x = Math.random() * width;
          }
          if (p.x > width) p.x = 0;
          if (p.x < 0) p.x = width;
        } else if (!isDay) {
          // Twinkling stars
          const currentOpacity =
            Math.abs(Math.sin(tick * (p.twinkleSpeed || 0.02))) * (p.opacity || 0.8);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(225, 240, 255, ${Math.max(0.1, currentOpacity)})`;
          ctx.fill();
        } else {
          // Gentle sunny ambient motes
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(250, 204, 21, ${p.opacity * 0.4})`;
          ctx.fill();

          p.y += p.speedY;
          p.x += p.speedX;

          if (p.y < 0) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [condition.category, current.isDay, current.windSpeed, current.weatherCode, enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      id="realistic-atmosphere-canvas"
      className="fixed inset-0 pointer-events-none z-10 opacity-70 transition-opacity duration-1000"
      aria-hidden="true"
    />
  );
};
