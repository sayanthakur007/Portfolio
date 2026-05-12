const topbar = document.querySelector(".topbar");
const scrollTopButton = document.querySelector(".scroll-top");
const navToggle = document.querySelector(".nav-toggle");
const navPanel = document.querySelector(".nav-panel");
const navLinks = document.querySelectorAll(".nav-panel a");
const sectionLinks = [...navLinks].filter((link) => link.getAttribute("href")?.startsWith("#"));
const themeToggle = document.querySelector(".theme-toggle");
const cursorGlow = document.querySelector(".cursor-glow");
const revealItems = document.querySelectorAll(".reveal");
const counters = document.querySelectorAll("[data-count]");
const tiltCards = document.querySelectorAll(".tilt-card");
const particleCanvas = document.querySelector(".particle-canvas");
const skillShapes = document.querySelectorAll("#skills .shape");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const trackedSections = sectionLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
let scrollTransitionTimer = 0;
let isDraggingCircle = false;

const random = (min, max) => Math.random() * (max - min) + min;

const getPreferredTheme = () => {
  const savedTheme = localStorage.getItem("portfolio-theme");
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
};

const syncThemeToggle = (theme) => {
  if (!themeToggle) return;
  const nextTheme = theme === "dark" ? "light" : "dark";
  themeToggle.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
  themeToggle.setAttribute("aria-pressed", String(theme === "light"));
};

const applyTheme = (theme) => {
  document.body.dataset.theme = theme;
  localStorage.setItem("portfolio-theme", theme);
  syncThemeToggle(theme);
};

applyTheme(getPreferredTheme());

themeToggle?.addEventListener("click", () => {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
});

const setScrolledState = () => {
  const isScrolled = window.scrollY > 24;
  topbar.classList.toggle("is-scrolled", isScrolled);
  scrollTopButton.classList.toggle("is-visible", window.scrollY > 500);
};

const closeMenu = () => {
  navPanel.classList.remove("is-open");
  navToggle?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
};

const openMenu = () => {
  navPanel.classList.add("is-open");
  navToggle?.setAttribute("aria-expanded", "true");
  document.body.classList.add("menu-open");
};

navToggle?.addEventListener("click", () => {
  const isOpen = navPanel.classList.contains("is-open");
  isOpen ? closeMenu() : openMenu();
});

navLinks.forEach((link) => {
  link.addEventListener("click", closeMenu);
});

const setActiveNavLink = (id) => {
  sectionLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === `#${id}`;
    link.classList.toggle("is-active", isActive);
  });
};

sectionLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const targetId = link.getAttribute("href");
    const target = targetId ? document.querySelector(targetId) : null;
    if (!target) return;

    event.preventDefault();
    document.body.classList.add("is-scrolling");
    trackedSections.forEach((section) => section.classList.toggle("nav-target", section === target));
    window.clearTimeout(scrollTransitionTimer);

    const topbarHeight = topbar?.offsetHeight ?? 0;
    const targetTop = target.getBoundingClientRect().top + window.scrollY - topbarHeight - 18;
    window.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: "smooth",
    });

    window.history.replaceState(null, "", targetId);
    setActiveNavLink(target.id);
    closeMenu();

    scrollTransitionTimer = window.setTimeout(() => {
      document.body.classList.remove("is-scrolling");
      trackedSections.forEach((section) => section.classList.remove("nav-target"));
    }, 650);
  });
});

scrollTopButton?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

window.addEventListener("scroll", setScrolledState, { passive: true });
setScrolledState();

const sectionObserver = new IntersectionObserver(
  (entries) => {
    const visibleEntry = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (visibleEntry?.target?.id) {
      setActiveNavLink(visibleEntry.target.id);
    }
  },
  { rootMargin: "-35% 0px -45% 0px", threshold: [0.2, 0.45, 0.7] }
);

trackedSections.forEach((section) => sectionObserver.observe(section));
setActiveNavLink("about");

window.addEventListener(
  "scroll",
  () => {
    if (!document.body.classList.contains("is-scrolling")) return;
    window.clearTimeout(scrollTransitionTimer);
    scrollTransitionTimer = window.setTimeout(() => {
      document.body.classList.remove("is-scrolling");
      trackedSections.forEach((section) => section.classList.remove("nav-target"));
    }, 180);
  },
  { passive: true }
);

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.16, rootMargin: "0px 0px -40px 0px" }
);

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index * 60, 360)}ms`;
  revealObserver.observe(item);
});

const animateCounter = (element) => {
  const target = Number(element.dataset.count);
  const duration = 1400;
  const startTime = performance.now();
  const isFloat = String(target).includes(".");

  const tick = (currentTime) => {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = target * eased;
    element.textContent = isFloat ? value.toFixed(2) : Math.round(value).toString();
    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  };

  requestAnimationFrame(tick);
};

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.6 }
);

counters.forEach((counter) => counterObserver.observe(counter));

tiltCards.forEach((card) => {
  const resetTilt = () => {
    card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
  };

  card.addEventListener("mousemove", (event) => {
    if (window.innerWidth < 900 || isDraggingCircle) return;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateY = ((x / rect.width) - 0.5) * 10;
    const rotateX = (0.5 - (y / rect.height)) * 10;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  card.addEventListener("mouseleave", resetTilt);
  card.addEventListener("blur", resetTilt, true);
});

const createSpring = ({ stiffness = 120, damping = 6 } = {}) => ({ stiffness, damping });

const createDraggable = (selector, { releaseEase = createSpring() } = {}) => {
  const elements = document.querySelectorAll(selector);
  if (!elements.length) return;

  elements.forEach((element) => {
    let x = 0;
    let y = 0;
    let velocityX = 0;
    let velocityY = 0;
    let pointerId = null;
    let startPointerX = 0;
    let startPointerY = 0;
    let startX = 0;
    let startY = 0;
    let springFrame = 0;
    let lastTime = 0;

    const applyTransform = () => {
      const rotation = x * 0.08;
      element.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg)`;
    };

    const stopSpring = () => {
      if (!springFrame) return;
      window.cancelAnimationFrame(springFrame);
      springFrame = 0;
    };

    const releaseToOrigin = () => {
      stopSpring();
      lastTime = performance.now();

      const tick = (now) => {
        const dt = Math.min((now - lastTime) / 1000, 0.032);
        lastTime = now;

        const springX = -releaseEase.stiffness * x;
        const springY = -releaseEase.stiffness * y;
        velocityX += springX * dt;
        velocityY += springY * dt;
        velocityX *= Math.max(0, 1 - releaseEase.damping * dt);
        velocityY *= Math.max(0, 1 - releaseEase.damping * dt);
        x += velocityX * dt * 60;
        y += velocityY * dt * 60;
        applyTransform();

        if (Math.abs(x) < 0.35 && Math.abs(y) < 0.35 && Math.abs(velocityX) < 0.2 && Math.abs(velocityY) < 0.2) {
          x = 0;
          y = 0;
          velocityX = 0;
          velocityY = 0;
          applyTransform();
          springFrame = 0;
          return;
        }

        springFrame = window.requestAnimationFrame(tick);
      };

      springFrame = window.requestAnimationFrame(tick);
    };

    element.addEventListener("dragstart", (event) => event.preventDefault());

    element.addEventListener("pointerdown", (event) => {
      pointerId = event.pointerId;
      startPointerX = event.clientX;
      startPointerY = event.clientY;
      startX = x;
      startY = y;
      velocityX = 0;
      velocityY = 0;
      isDraggingCircle = true;
      element.classList.add("is-dragging");
      stopSpring();
      element.setPointerCapture(pointerId);
    });

    element.addEventListener("pointermove", (event) => {
      if (pointerId !== event.pointerId) return;
      const nextX = startX + (event.clientX - startPointerX);
      const nextY = startY + (event.clientY - startPointerY);
      x = Math.max(-80, Math.min(80, nextX));
      y = Math.max(-80, Math.min(80, nextY));
      applyTransform();
    });

    const endDrag = (event) => {
      if (pointerId !== event.pointerId) return;
      if (element.hasPointerCapture(pointerId)) {
        element.releasePointerCapture(pointerId);
      }
      pointerId = null;
      isDraggingCircle = false;
      element.classList.remove("is-dragging");
      releaseToOrigin();
    };

    element.addEventListener("pointerup", endDrag);
    element.addEventListener("pointercancel", endDrag);
  });
};

const setupSkillShapeAnimation = () => {
  if (!skillShapes.length) return;

  if (prefersReducedMotion.matches) {
    skillShapes.forEach((shape) => {
      shape.getAnimations().forEach((animation) => animation.cancel());
      shape.style.transform = "translate3d(0, 0, 0) rotate(0deg)";
    });
    return;
  }

  const animateShape = (shape) => {
    shape.animate(
      [
        { transform: getComputedStyle(shape).transform === "none" ? "translate3d(0, 0, 0) rotate(0deg)" : getComputedStyle(shape).transform },
        {
          transform: `translate3d(${random(-100, 100)}px, ${random(-100, 100)}px, 0) rotate(${random(-180, 180)}deg)`,
        },
      ],
      {
        duration: random(500, 1000),
        easing: "ease-in-out",
        fill: "forwards",
      }
    ).addEventListener("finish", () => animateShape(shape), { once: true });
  };

  skillShapes.forEach((shape) => {
    shape.getAnimations().forEach((animation) => animation.cancel());
    animateShape(shape);
  });
};

window.addEventListener("resize", () => {
  if (window.innerWidth > 860) {
    closeMenu();
  }
});

prefersReducedMotion.addEventListener("change", setupSkillShapeAnimation);
setupSkillShapeAnimation();
createDraggable(".circle", {
  releaseEase: createSpring({
    stiffness: 120,
    damping: 6,
  }),
});

if (cursorGlow && window.matchMedia("(pointer:fine)").matches) {
  document.body.classList.add("has-pointer");
  window.addEventListener(
    "pointermove",
    (event) => {
      cursorGlow.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)`;
    },
    { passive: true }
  );
}

const setupParticles = () => {
  if (!particleCanvas) return;

  const context = particleCanvas.getContext("2d");
  if (!context) return;

  let animationFrame = 0;
  let stars = [];
  let dust = [];
  let width = 0;
  let height = 0;
  let time = 0;
  let lastFrameTime = performance.now();
  let pointer = { x: 0, y: 0, active: false };
  const recycleBuffer = 120;
  const readThemeColor = (name, fallback) =>
    getComputedStyle(document.body).getPropertyValue(name).trim() || fallback;

  const linkDistance = 150;

  const resizeCanvas = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    particleCanvas.width = Math.floor(width * ratio);
    particleCanvas.height = Math.floor(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const totalStars = Math.max(72, Math.min(165, Math.floor(width / 11)));
    stars = Array.from({ length: totalStars }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.42,
      vy: (Math.random() - 0.5) * 0.42,
      radius: Math.random() * 1.35 + 0.45,
      phase: Math.random() * Math.PI * 2,
      drift: 0.28 + Math.random() * 0.75,
      twinkle: 0.7 + Math.random() * 1.8,
      bright: Math.random() < 0.14,
    }));

    const dustCount = Math.min(420, Math.max(140, Math.floor((width * height) / 9000)));
    dust = Array.from({ length: dustCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.06,
      vy: (Math.random() - 0.5) * 0.06,
      r: Math.random() * 0.9 + 0.25,
      phase: Math.random() * Math.PI * 2,
      twinkle: 0.4 + Math.random() * 1.2,
    }));
  };

  const recycleParticle = (particle, driftX, driftY) => {
    if (particle.x < -recycleBuffer) {
      particle.x = width + recycleBuffer;
      particle.y = Math.random() * height;
    } else if (particle.x > width + recycleBuffer) {
      particle.x = -recycleBuffer;
      particle.y = Math.random() * height;
    }

    if (particle.y < -recycleBuffer) {
      particle.y = height + recycleBuffer;
      particle.x = Math.random() * width;
    } else if (particle.y > height + recycleBuffer) {
      particle.y = -recycleBuffer;
      particle.x = Math.random() * width;
    }

    if (Math.abs(driftX) > Math.abs(driftY)) {
      particle.y = (particle.y + height) % height;
    } else {
      particle.x = (particle.x + width) % width;
    }
  };

  const drawSpaceVignette = () => {
    const light = document.body.dataset.theme === "light";
    const outer = light ? "rgba(230, 238, 255, 0.28)" : "rgba(1, 4, 12, 0.42)";
    const mid = light ? "rgba(245, 248, 255, 0.04)" : "rgba(4, 10, 24, 0.08)";
    const cx = width * 0.5;
    const cy = height * 0.45;
    const r0 = Math.min(width, height) * 0.35;
    const r1 = Math.max(width, height) * 0.72;
    const g = context.createRadialGradient(cx, cy, r0, cx, cy, r1);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.55, mid);
    g.addColorStop(1, outer);
    context.fillStyle = g;
    context.fillRect(0, 0, width, height);
  };

  const drawDustLayer = (t, dotColor, coreColor) => {
    dust.forEach((d) => {
      const tw = 0.55 + 0.45 * Math.sin(t * d.twinkle + d.phase);
      context.globalAlpha = 0.35 * tw;
      context.fillStyle = dotColor;
      context.beginPath();
      context.arc(d.x, d.y, d.r * (0.85 + 0.15 * tw), 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 0.9 * tw;
      context.fillStyle = coreColor;
      context.beginPath();
      context.arc(d.x, d.y, Math.max(d.r * 0.35, 0.2), 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
    });
  };

  const drawStarBody = (star, dotColor, coreColor, twinkleAmt) => {
    const r = star.radius * twinkleAmt;
    const cx = star.x;
    const cy = star.y;

    if (star.bright) {
      context.save();
      context.strokeStyle = dotColor;
      context.lineWidth = 0.6;
      context.globalAlpha = 0.35 * twinkleAmt;
      const arm = r * 3.2;
      context.beginPath();
      context.moveTo(cx - arm, cy);
      context.lineTo(cx + arm, cy);
      context.moveTo(cx, cy - arm);
      context.lineTo(cx, cy + arm);
      context.stroke();
      context.restore();
    }

    context.fillStyle = dotColor;
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = coreColor;
    context.beginPath();
    context.arc(cx, cy, Math.max(r * 0.38, 0.35), 0, Math.PI * 2);
    context.fill();
  };

  const render = (now = performance.now()) => {
    const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
    const frameFactor = dt * 60;
    lastFrameTime = now;
    time += dt;
    context.clearRect(0, 0, width, height);
    drawSpaceVignette();

    const dotColor = readThemeColor("--particle-dot", "rgba(186, 220, 255, 0.92)");
    const lineColor = readThemeColor("--particle-line", "rgba(130, 200, 255, 0.28)");
    const glowColor = readThemeColor("--particle-glow", "rgba(125, 211, 252, 0.55)");
    const coreColor = readThemeColor("--particle-core", "rgba(255, 255, 255, 0.98)");

    const streamX = Math.sin(time * 0.16) * 0.08 + 0.16;
    const streamY = Math.cos(time * 0.12) * 0.06 - 0.08;

    dust.forEach((d) => {
      d.x += (d.vx + streamX * 0.24) * frameFactor;
      d.y += (d.vy + streamY * 0.24) * frameFactor;
      recycleParticle(d, streamX, streamY);
    });

    stars.forEach((star) => {
      const flowX = Math.sin(time * star.drift + star.phase) * 0.28;
      const flowY = Math.cos(time * star.drift * 0.86 + star.phase * 1.25) * 0.24;
      star.x += (star.vx + flowX + streamX) * frameFactor;
      star.y += (star.vy + flowY + streamY) * frameFactor;
      recycleParticle(star, streamX, streamY);
    });

    if (pointer.active) {
      stars.forEach((star) => {
        const dx = pointer.x - star.x;
        const dy = pointer.y - star.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 190 && distance > 0.5) {
          star.x -= dx * 0.0024;
          star.y -= dy * 0.0024;
        }
      });
    }

    drawDustLayer(time, dotColor, coreColor);

    for (let i = 0; i < stars.length; i += 1) {
      const a = stars[i];
      for (let j = i + 1; j < stars.length; j += 1) {
        const b = stars[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.hypot(dx, dy);

        if (distance < linkDistance) {
          const fade = 1 - distance / linkDistance;
          context.save();
          context.globalAlpha = fade * 0.55;
          context.strokeStyle = lineColor;
          context.lineWidth = fade * 1.15;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();
          context.restore();
        }
      }
    }

    if (pointer.active) {
      stars.forEach((star) => {
        const dx = pointer.x - star.x;
        const dy = pointer.y - star.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 190 && distance > 0.5) {
          const fade = 1 - distance / 190;
          context.save();
          context.globalAlpha = fade * 0.5;
          context.strokeStyle = glowColor;
          context.lineWidth = fade * 1.1;
          context.beginPath();
          context.moveTo(star.x, star.y);
          context.lineTo(pointer.x, pointer.y);
          context.stroke();
          context.restore();
        }
      });
    }

    stars.forEach((star) => {
      const twinkleAmt = 0.72 + 0.28 * Math.sin(time * star.twinkle + star.phase);
      drawStarBody(star, dotColor, coreColor, twinkleAmt);
    });

    animationFrame = window.requestAnimationFrame((t) => render(t));
  };

  const start = () => {
    window.cancelAnimationFrame(animationFrame);
    lastFrameTime = performance.now();
    resizeCanvas();
    render();
  };

  resizeCanvas();
  start();

  window.addEventListener("resize", start);
  window.addEventListener("mousemove", (event) => {
    pointer = { x: event.clientX, y: event.clientY, active: true };
  });
  window.addEventListener("mouseleave", () => {
    pointer.active = false;
  });
  window.addEventListener("touchmove", (event) => {
    const touch = event.touches[0];
    if (!touch) return;
    pointer = { x: touch.clientX, y: touch.clientY, active: true };
  }, { passive: true });
  window.addEventListener("touchend", () => {
    pointer.active = false;
  });
  prefersReducedMotion.addEventListener("change", start);
};

setupParticles();

// Page loader animation 0-100 and rotating titles
const setupPageLoader = () => {
  const loader = document.getElementById("page-loader");
  const loaderValue = document.getElementById("loaderValue");
  const loaderMessage = document.getElementById("loaderMessage");
  const loaderBarFill = document.getElementById("loaderBarFill");

  if (!loader || !loaderValue || !loaderMessage) return;

  const titles = ["web developer", "front-end developer", "web app developer"];
  const minimumVisibleMs = 3000;
  const fallbackTimeoutMs = 5200;
  const startedAt = performance.now();
  let messageIndex = 0;
  let progress = 0;
  let isComplete = false;
  let hasWindowLoaded = document.readyState === "complete";

  const setProgress = (value) => {
    progress = Math.min(100, Math.max(0, Math.floor(value)));
    loaderValue.textContent = progress;
    if (loaderBarFill) {
      loaderBarFill.style.width = `${progress}%`;
    }
  };

  const rotateMessage = () => {
    messageIndex = (messageIndex + 1) % titles.length;
    loaderMessage.textContent = titles[messageIndex];
  };

  const finishLoader = () => {
    if (isComplete) return;
    isComplete = true;
    setProgress(100);
    loader.classList.add("is-hidden");
    document.body.classList.remove("with-loader");
  };

  const clearLoaderTimers = () => {
    clearInterval(progressInterval);
    clearInterval(messageInterval);
  };

  const syncLoaderProgress = () => {
    if (isComplete) return;

    const elapsed = performance.now() - startedAt;

    if (!hasWindowLoaded) {
      const stagedProgress = elapsed >= minimumVisibleMs
        ? 99
        : Math.min(99, (elapsed / minimumVisibleMs) * 100);
      setProgress(stagedProgress);
      return;
    }

    if (elapsed < minimumVisibleMs) {
      setProgress(Math.min(99, (elapsed / minimumVisibleMs) * 100));
      return;
    }

    clearLoaderTimers();
    finishLoader();
  };

  const progressInterval = setInterval(syncLoaderProgress, 30);

  const messageInterval = setInterval(rotateMessage, 1600);

  syncLoaderProgress();

  window.addEventListener("load", () => {
    hasWindowLoaded = true;
    syncLoaderProgress();
  });

  setTimeout(() => {
    if (!isComplete) {
      clearLoaderTimers();
      finishLoader();
    }
  }, fallbackTimeoutMs);
};

if (document.readyState === "complete") {
  setupPageLoader();
} else {
  window.addEventListener("DOMContentLoaded", setupPageLoader);
}
