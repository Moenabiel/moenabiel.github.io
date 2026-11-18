/**
 * site.ts — motion boot for the portfolio.
 *
 * Contract:
 *  - prefers-reduced-motion: NO typing, NO reveals-from-hidden, NO Lenis.
 *    Everything visible instantly (CSS collapses durations + JS bails).
 *  - no-JS: html has no .js class → CSS from-states never apply.
 *  - failure: if anything throws before boot, remove the .js class so the
 *    page falls back to fully-static content.
 */

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

try {
  if (!reduced) {
    boot();
  } else {
    // Reduced motion: mark all typed lines done, reveals visible.
    document.querySelectorAll<HTMLElement>('[data-line]').forEach((el) => {
      el.classList.add('is-done');
    });
  }
} catch (err) {
  document.documentElement.classList.remove('js');
  // eslint-disable-next-line no-console
  console.error('motion boot failed; static fallback', err);
}

function boot(): void {
  Promise.all([import('lenis'), import('gsap')])
    .then(([{ default: Lenis }, { gsap }]) => {
      /* 1. Lenis smooth scroll (disabled for rM by contract). */
      const lenis = new Lenis({
        duration: 1.1,
        smoothWheel: true,
      });
      const raf = (time: number) => {
        lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);

      /* 2. Terminal typing — real lines, char-by-char, 34ms/char. */
      const body = document.querySelector<HTMLElement>('[data-terminal]');
      if (body) typeTerminal(body);

      /* 3. Scroll reveals — LAW: JS owns from-states, CSS never hides. */
      const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');
      gsap.set(targets, { opacity: 0, y: 18 });
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              gsap.to(entry.target, {
                opacity: 1,
                y: 0,
                duration: 0.64,
                ease: 'expo.out',
                overwrite: true,
              });
              io.unobserve(entry.target);
            }
          });
        },
        { rootMargin: '0px 0px -12% 0px' },
      );
      targets.forEach((t) => io.observe(t));

      /* 4. Marquee drift — slow, honest, rM-collapsed via CSS durations.
         Speed tied to scroll velocity is over-engineering here; keep it calm. */
      const track = document.querySelector<HTMLElement>('.marquee-track');
      if (track) {
        gsap.to(track, {
          xPercent: -50,
          duration: 28,
          ease: 'none',
          repeat: -1,
        });
      }
    },
  )
  .catch((err) => {
    // GSAP/Lenis load failure → static fallback: force everything visible.
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    document.documentElement.classList.remove('js');
    // eslint-disable-next-line no-console
    console.error('motion modules failed to load; static fallback', err);
  });
}

/* Terminal typer: reveals each [data-line] in order.
   Prompt lines type the command text; output lines appear whole (reads true). */
function typeTerminal(body: HTMLElement): void {
  const lines = Array.from(body.querySelectorAll<HTMLElement>('[data-line]'));
  if (!lines.length) return;

  let chain: Promise<void> = Promise.resolve();

  lines.forEach((line, idx) => {
    chain = chain.then(
      () =>
        new Promise<void>((resolve) => {
          const isCommand = !!line.querySelector('.t-cmd');
          line.classList.add('is-typed');

          if (!isCommand || reduced) {
            line.classList.add('is-done');
            resolve();
            return;
          }

          // Type the command chars.
          const cmd = line.querySelector<HTMLElement>('.t-cmd');
          if (!cmd) {
            line.classList.add('is-done');
            resolve();
            return;
          }
          const text = cmd.textContent ?? '';
          cmd.textContent = '';
          let i = 0;
          const step = () => {
            if (i < text.length) {
              cmd.textContent += text[i];
              i += 1;
              window.setTimeout(step, 34);
            } else {
              line.classList.add('is-done');
              resolve();
            }
          };
          step();
        }),
    );
    // Small gap between lines, larger after output lines.
    if (idx < lines.length - 1) {
      chain = chain.then(() => new Promise<void>((r) => window.setTimeout(r, 90)));
    }
  });
}
