import { useEffect, useRef } from 'react';

const DOT_SPACING = 32;
const DOT_RADIUS = 1;
const DOT_RADIUS_ACTIVE = 2.5;
const INFLUENCE_RADIUS = 180;
const PARTICLE_COUNT = 35;

export default function InteractiveBackground() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const particlesRef = useRef([]);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let w, h, cols, rows;

    const particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        baseAlpha: Math.random() * 0.15 + 0.05,
      });
    }
    particlesRef.current = particles;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      cols = Math.ceil(w / DOT_SPACING);
      rows = Math.ceil(h / DOT_SPACING);
    };

    resize();
    window.addEventListener('resize', resize);

    const onMouse = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const onMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    window.addEventListener('mousemove', onMouse);
    document.addEventListener('mouseleave', onMouseLeave);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      ctx.fillStyle = '#ffffff';
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const dx = c * DOT_SPACING + DOT_SPACING / 2;
          const dy = r * DOT_SPACING + DOT_SPACING / 2;
          const dist = Math.hypot(dx - mx, dy - my);

          if (dist < INFLUENCE_RADIUS) {
            const t = 1 - dist / INFLUENCE_RADIUS;
            const alpha = 0.04 + t * 0.35;
            const radius = DOT_RADIUS + (DOT_RADIUS_ACTIVE - DOT_RADIUS) * t;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(dx, dy, radius, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.globalAlpha = 0.04;
            ctx.beginPath();
            ctx.arc(dx, dy, DOT_RADIUS, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      if (mx > -500) {
        const grad = ctx.createRadialGradient(mx, my, 0, mx, my, INFLUENCE_RADIUS);
        grad.addColorStop(0, 'rgba(229, 9, 20, 0.06)');
        grad.addColorStop(0.5, 'rgba(229, 9, 20, 0.02)');
        grad.addColorStop(1, 'rgba(229, 9, 20, 0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = grad;
        ctx.fillRect(mx - INFLUENCE_RADIUS, my - INFLUENCE_RADIUS, INFLUENCE_RADIUS * 2, INFLUENCE_RADIUS * 2);
      }

      ctx.fillStyle = '#e50914';
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const dist = Math.hypot(p.x - mx, p.y - my);
        if (dist < INFLUENCE_RADIUS) {
          const t = 1 - dist / INFLUENCE_RADIUS;
          const angle = Math.atan2(p.y - my, p.x - mx);
          p.vx += Math.cos(angle) * t * 0.02;
          p.vy += Math.sin(angle) * t * 0.02;
        }

        p.vx *= 0.99;
        p.vy *= 0.99;

        const distToMouse = Math.hypot(p.x - mx, p.y - my);
        const alphaBoost = distToMouse < INFLUENCE_RADIUS
          ? p.baseAlpha + (1 - distToMouse / INFLUENCE_RADIUS) * 0.3
          : p.baseAlpha;

        ctx.globalAlpha = alphaBoost;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
      document.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
