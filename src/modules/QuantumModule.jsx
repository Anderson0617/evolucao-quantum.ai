/*
 * QuantumModule — usage:
 * import QuantumModule from "./modules/QuantumModule";
 * <QuantumModule id="quantica" audioEnabled={audioOn} volume={masterVolume} />
 */
import { useEffect, useRef, useState } from "react";
import "../styles/quantum.css";
import QuantumCity from "./quantum-city/QuantumCity";
import "./quantum-city/quantum-city.css";
import { resolvePublicAsset } from "../utils/assetPaths";

const VIDEO_SOURCE = resolvePublicAsset("assets/videos/pulso-de-luz.mp4");
const VIDEO_POSTER = resolvePublicAsset("assets/img/3-ambiente-quantico.jpg");
const AMBIENT_AUDIO_SOURCE = resolvePublicAsset("assets/audio/eletresidade.mp3");
const CLICK_AUDIO_SOURCE = resolvePublicAsset("assets/audio/click-rele.mp3");

const LOAD_MARGIN_PX = 320;
const PULSE_LIFETIME_MS = 620;
const SUPERPOSITION_SPIN_MS = 1200;

const QUANTUM_GALLERY_IMAGES = [
  {
    src: "assets/img/1-foto.jpg",
    alt: "Registro quântico 1 exibindo componentes energizados.",
  },
  {
    src: "assets/img/2-foto.jpg",
    alt: "Registro quântico 2 com partículas em emissão luminosa.",
  },
  {
    src: "assets/img/3-foto.jpg",
    alt: "Registro quântico 3 demonstrando feixes entrelaçados.",
  },
  {
    src: "assets/img/4-foto.jpg",
    alt: "Registro quântico 4 revelando circuitos criogênicos.",
  },
  {
    src: "assets/img/5-foto.jpg",
    alt: "Registro quântico 5 focado em cabos supercondutores.",
  },
  {
    src: "assets/img/6-foto.jpg",
    alt: "Registro quântico 6 com cubo de interferência.",
  },
  {
    src: "assets/img/7-foto.jpg",
    alt: "Registro quântico 7 destacando cápsulas de resfriamento.",
  },
  {
    src: "assets/img/8-foto.jpg",
    alt: "Registro quântico 8 com módulos de controle óptico.",
  },
];

const clampVolume = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
};

const safePlay = (media) => {
  if (!media) {
    return;
  }
  const playPromise = media.play?.();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {
      /* ignored on purpose ï¿½?? autoplay policies */
    });
  }
};

const isActivationKey = (event) =>
  event.key === "Enter" || event.key === " " || event.key === "Spacebar";

const clampPercent = (value) => {
  if (!Number.isFinite(value)) {
    return 50;
  }
  return Math.min(100, Math.max(0, value));
};

function QuantumModule({
  id = "quantica",
  audioEnabled = false,
  volume = 0.8,
  onEnterSection,
  onLeaveSection,
}) {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const ambientAudioRef = useRef(null);
  const clickAudioRef = useRef(null);

  const [inView, setInView] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [pulses, setPulses] = useState([]);
  const [superpositionActive, setSuperpositionActive] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);


  const pulseIdRef = useRef(0);
  const previousVisibilityRef = useRef(false);
  const videoLoadedRef = useRef(false);
  const registeredTimeoutsRef = useRef([]);
  const pointerTargetRef = useRef({ x: 50, y: 50 });
  const pointerCurrentRef = useRef({ x: 50, y: 50 });
  const pointerAnimationRef = useRef(null);
  const panelPinnedRef = useRef(false);

  // Lazy load video and manage section visibility.
  useEffect(() => {
    const sectionEl = sectionRef.current;
    const videoEl = videoRef.current;
    if (!sectionEl || !videoEl) {
      return undefined;
    }

    const evaluate = () => {
      const rect = sectionEl.getBoundingClientRect();
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight;

      const shouldLoad =
        rect.top <= viewportHeight + LOAD_MARGIN_PX &&
        rect.bottom >= -LOAD_MARGIN_PX;
      const isVisible = rect.top < viewportHeight && rect.bottom > 0;

      if (shouldLoad && !videoLoadedRef.current) {
        videoEl.src = VIDEO_SOURCE;
        videoLoadedRef.current = true;
      }

      setInView((prev) => {
        if (prev === isVisible) {
          return prev;
        }
        return isVisible;
      });
    };

    let observer;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(() => {
            evaluate();
          });
        },
        {
          root: null,
          rootMargin: `${LOAD_MARGIN_PX}px 0px`,
          threshold: [0, 0.25, 0.5],
        }
      );
      observer.observe(sectionEl);
      evaluate();
    } else {
      const handleScroll = () => evaluate();
      const handleResize = () => evaluate();
      window.addEventListener("scroll", handleScroll, { passive: true });
      window.addEventListener("resize", handleResize);
      evaluate();
      return () => {
        window.removeEventListener("scroll", handleScroll);
        window.removeEventListener("resize", handleResize);
      };
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  // Track pointer for the parallax halo with smooth lerp animation.
  useEffect(() => {
    const sectionEl = sectionRef.current;
    if (!sectionEl) {
      return undefined;
    }

    pointerTargetRef.current = { x: 50, y: 50 };
    pointerCurrentRef.current = { x: 50, y: 50 };

    const animatePointer = () => {
      const section = sectionRef.current;
      if (!section) {
        pointerAnimationRef.current = null;
        return;
      }
      const current = pointerCurrentRef.current;
      const target = pointerTargetRef.current;
      current.x += (target.x - current.x) * 0.12;
      current.y += (target.y - current.y) * 0.12;
      section.style.setProperty("--pointer-x", `${current.x.toFixed(2)}%`);
      section.style.setProperty("--pointer-y", `${current.y.toFixed(2)}%`);
      pointerAnimationRef.current = window.requestAnimationFrame(animatePointer);
    };

    pointerAnimationRef.current = window.requestAnimationFrame(animatePointer);

    const updatePointer = (event) => {
      const rect = sectionEl.getBoundingClientRect();
      const x = clampPercent(((event.clientX - rect.left) / rect.width) * 100);
      const y = clampPercent(((event.clientY - rect.top) / rect.height) * 100);
      pointerTargetRef.current = { x, y };
    };

    const resetPointer = () => {
      pointerTargetRef.current = { x: 50, y: 50 };
    };

    sectionEl.addEventListener("pointermove", updatePointer);
    sectionEl.addEventListener("pointerleave", resetPointer);
    resetPointer();

    return () => {
      sectionEl.removeEventListener("pointermove", updatePointer);
      sectionEl.removeEventListener("pointerleave", resetPointer);
      if (pointerAnimationRef.current !== null) {
        window.cancelAnimationFrame(pointerAnimationRef.current);
        pointerAnimationRef.current = null;
      }
    };
  }, []);

  // Sync volume for both audio elements.
  useEffect(() => {
    const clamped = clampVolume(volume);
    if (ambientAudioRef.current) {
      ambientAudioRef.current.volume = clamped;
    }
    if (clickAudioRef.current) {
      clickAudioRef.current.volume = Math.max(0, Math.min(1, clamped * 0.6));
    }
  }, [volume]);

  // Handle section entry/exit plus audio state.
  useEffect(() => {
    const videoEl = videoRef.current;
    const ambientAudioEl = ambientAudioRef.current;
    const wasInView = previousVisibilityRef.current;
    const entering = inView && !wasInView;
    const leaving = !inView && wasInView;

    if (entering) {
      if (videoLoadedRef.current && videoEl) {
        safePlay(videoEl);
      }
      if (ambientAudioEl && audioEnabled) {
        safePlay(ambientAudioEl);
      }
      if (typeof onEnterSection === "function") {
        onEnterSection();
      }
    }

    if (!inView && videoEl) {
      videoEl.pause();
    }

    if (ambientAudioEl) {
      if (inView && audioEnabled) {
        safePlay(ambientAudioEl);
      } else {
        ambientAudioEl.pause();
      }
    }

    if (leaving && typeof onLeaveSection === "function") {
      onLeaveSection();
    }

    previousVisibilityRef.current = inView;
  }, [audioEnabled, inView, onEnterSection, onLeaveSection]);


  // Mark video as ready for subtle reveal styles.
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) {
      return undefined;
    }
    const handleLoaded = () => setVideoReady(true);
    videoEl.addEventListener("loadeddata", handleLoaded);
    return () => {
      videoEl.removeEventListener("loadeddata", handleLoaded);
    };
  }, []);

  // Clean up any pending animations and media when unmounting.
  useEffect(
    () => () => {
      registeredTimeoutsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      registeredTimeoutsRef.current = [];
      if (videoRef.current) {
        videoRef.current.pause();
      }
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
      }
      if (clickAudioRef.current) {
        clickAudioRef.current.pause();
      }
    },
    []
  );

  useEffect(() => {
    if (!inView) {
      return undefined;
    }
    const intervalId = window.setInterval(() => {
      setGalleryIndex((prev) => {
        const next = prev + 1;
        return next >= QUANTUM_GALLERY_IMAGES.length ? 0 : next;
      });
    }, 4200);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [inView]);

  const currentGalleryImage = QUANTUM_GALLERY_IMAGES[galleryIndex];

  // Create and schedule a dissipating pulse centered on the pointer coordinates.
  const triggerPulse = (clientX, clientY) => {
    const sectionEl = sectionRef.current;
    if (!sectionEl) {
      return;
    }
    const rect = sectionEl.getBoundingClientRect();
    const x = clampPercent(((clientX - rect.left) / rect.width) * 100);
    const y = clampPercent(((clientY - rect.top) / rect.height) * 100);

    const pulseId = pulseIdRef.current + 1;
    pulseIdRef.current = pulseId;

    setPulses((prev) => [...prev, { id: pulseId, x, y }]);

    const timeoutId = window.setTimeout(() => {
      setPulses((prev) => prev.filter((pulse) => pulse.id !== pulseId));
      registeredTimeoutsRef.current = registeredTimeoutsRef.current.filter(
        (storedId) => storedId !== timeoutId
      );
    }, PULSE_LIFETIME_MS);

    registeredTimeoutsRef.current.push(timeoutId);
  };

  // Gate the interaction click sound by the global audio toggle.
  const playClickEffect = () => {
    if (!audioEnabled) {
      return;
    }
    const clickAudioEl = clickAudioRef.current;
    if (!clickAudioEl) {
      return;
    }
    clickAudioEl.currentTime = 0;
    safePlay(clickAudioEl);
  };

  // Respond to button or keyboard activation by pulsing and playing audio feedback.
  const handleActivation = (event) => {
    if (event.type === "keydown" && !isActivationKey(event)) {
      return;
    }

    const sectionRect = sectionRef.current?.getBoundingClientRect();
    const targetRect =
      event.currentTarget instanceof Element
        ? event.currentTarget.getBoundingClientRect()
        : null;
    const fallbackPoint = {
      clientX: (targetRect || sectionRect)
        ? (targetRect || sectionRect).left +
          (targetRect || sectionRect).width / 2
        : window.innerWidth / 2,
      clientY: (targetRect || sectionRect)
        ? (targetRect || sectionRect).top +
          (targetRect || sectionRect).height / 2
        : window.innerHeight / 2,
    };

    const { clientX, clientY } =
      event.type === "keydown" ? fallbackPoint : event;

    triggerPulse(clientX, clientY);
    playClickEffect();
    setSuperpositionActive(true);

    const resetTimeoutId = window.setTimeout(() => {
      setSuperpositionActive(false);
      registeredTimeoutsRef.current = registeredTimeoutsRef.current.filter(
        (storedId) => storedId !== resetTimeoutId
      );
    }, SUPERPOSITION_SPIN_MS);
    registeredTimeoutsRef.current.push(resetTimeoutId);

    if (event.type === "keydown") {
      event.preventDefault();
    }
  };

  // Manage the expandable educational panel state (hover or toggle pin).
  const togglePanel = () => {
    setPanelExpanded((prev) => {
      const next = !prev;
      panelPinnedRef.current = next;
      return next;
    });
  };

  const expandPanel = () => {
    setPanelExpanded(true);
  };

  const collapsePanel = () => {
    if (panelPinnedRef.current) {
      return;
    }
    setPanelExpanded(false);
  };

  const handlePanelBlur = (event) => {
    if (panelPinnedRef.current) {
      return;
    }
    const panelEl = event.currentTarget;
    const nextFocused = event.relatedTarget;
    if (panelEl && nextFocused && panelEl.contains(nextFocused)) {
      return;
    }
    setPanelExpanded(false);
  };

  const handlePanelKey = (event) => {
    if (!isActivationKey(event)) {
      return;
    }
    event.preventDefault();
    togglePanel();
  };

  const sectionClass = `quantum-section${inView ? " is-active" : ""}${videoReady ? " is-video-ready" : ""} is-city-mode`;

  return (
    <section
      id={id}
      ref={sectionRef}
      className={sectionClass}
      aria-labelledby={`${id}-title`}
    >
      {/* Background video and energetic grid overlay */}
      <div className="quantum-media-layer" aria-hidden="true">
        <video
          ref={videoRef}
          className="quantum-background-video"
          playsInline
          loop
          muted
          preload="none"
          poster={VIDEO_POSTER}
        />
        <div className="quantum-media-overlay" />
      </div>

      {/* Radial pulses triggered on superposition discovery */}
      <div className="quantum-pulse-layer" aria-hidden="true">
        {pulses.map((pulse) => (
          <span
            key={pulse.id}
            className="quantum-pulse"
            style={{
              "--pulse-x": `${pulse.x}%`,
              "--pulse-y": `${pulse.y}%`,
            }}
          />
        ))}
      </div>

      <div className="quantum-content is-city-mode">
        <div className="quantum-city-callout" role="note">
          <p className="quantum-city-callout__title">
            Experimento mental: o Gato de Schrödinger
          </p>
          <p className="quantum-city-callout__text">
            Proposto por Erwin Schrödinger em 1935, o experimento expõe o paradoxo de aplicar
            as regras da mecânica quântica a um sistema macroscópico. O gato permanece em
            superposição — vivo e morto — até que uma observação colapse o estado.
          </p>
        </div>
        <div className="quantum-city-overlay" aria-hidden="true" />
        <div className="quantum-city-wrapper">
          <QuantumCity audioEnabled={audioEnabled} volume={volume} />
        </div>

        <header className="quantum-header">
          <div className="quantum-header-text">
            <h2 id={`${id}-title`} className="quantum-title">
              Seção Quântica: Futuro da Computação
            </h2>
            <p className="quantum-lead">
              No mundo quântico, a informação não é binária — ela é probabilística.
            </p>
          </div>
          <div
            className="quantum-gallery-window"
            aria-live="polite"
            aria-label="Galeria visual da computação quântica"
          >
            <div className="quantum-gallery-frame">
              <img
                key={currentGalleryImage.src}
                className="quantum-gallery-image"
                src={resolvePublicAsset(currentGalleryImage.src)}
                loading="lazy"
                alt={currentGalleryImage.alt}
              />
            </div>
            <div className="quantum-gallery-indicators" role="presentation">
              {QUANTUM_GALLERY_IMAGES.map((_, index) => (
                <span
                  key={index}
                  className={`quantum-gallery-dot${
                    index === galleryIndex ? " is-active" : ""
                  }`}
                />
              ))}
            </div>
          </div>
        </header>

        <div className="quantum-grid">
          <article
            className="quantum-card qubit-card"
            tabIndex={0}
            aria-label="Visualizar detalhes do circuito de qubits com destaque energizado."
          >
            <div className="quantum-card-media">
              <img
                src={resolvePublicAsset("assets/img/1-circuito-qubits.jpg")}
                loading="lazy"
                alt="Circuito de qubits interligados por feixes de luz azul."
              />
            </div>
            <div className="quantum-card-body">
              <h3 className="quantum-card-title">Circuito de Qubits</h3>
              <p className="quantum-card-text">
                Ajustes dinâmicos mantêm a coerência quântica ativa e pronta
                para resolver padrões que resistiam à computação clássica.
              </p>
            </div>
          </article>

          <div className="quantum-card superposition-card">
            <button
              type="button"
              className="superposition-trigger"
              onClick={handleActivation}
              aria-pressed={superpositionActive}
              aria-label="Ativar visualização de superposição com pulso energético."
            >
              <span className="trigger-label">Superposição</span>
            </button>
            <div
              className={`superposition-visual${
                superpositionActive ? " is-active" : ""
              }`}
            >
              <img
                src={resolvePublicAsset("assets/img/2-superposicao.jpg")}
                loading="lazy"
                alt="Representação visual de partículas em estado de superposição."
                onClick={handleActivation}
                onKeyDown={handleActivation}
                role="button"
                tabIndex={0}
                aria-label="Descobrir a superposição com um pulso reativo."
              />
            </div>
            <p className="quantum-card-text">
              Toque e perceba o colapso controlado: um breve pulso revela a
              transição entre estados e a leitura estabiliza o resultado.
            </p>
          </div>
        </div>
      </div>

      {/* Ambient and interaction audio sources */}
      <audio
        ref={ambientAudioRef}
        className="quantum-audio"
        src={AMBIENT_AUDIO_SOURCE}
        preload="auto"
        loop
        aria-hidden="true"
      />
      <audio
        ref={clickAudioRef}
        className="quantum-audio"
        src={CLICK_AUDIO_SOURCE}
        preload="auto"
        aria-hidden="true"
      />
    </section>
  );
}

export default QuantumModule;





























