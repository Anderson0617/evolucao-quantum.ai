/*
 * ProcessorModule â usage:
 * import ProcessorModule from "./modules/ProcessorModule";
 * <ProcessorModule id="processadores" audioEnabled={audioOn} volume={masterVolume} />
 */
import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/processor.css";
import { resolvePublicAsset } from "../utils/assetPaths";

const VIDEO_SOURCE = resolvePublicAsset("assets/videos/moderno.mp4");
const AMBIENT_AUDIO_SOURCE = resolvePublicAsset("assets/audio/datacenter.mp3");
const CLICK_AUDIO_SOURCE = resolvePublicAsset("assets/audio/click-rele.mp3");

const LOAD_MARGIN_PX = 320;
const FLOW_LIFETIME_MS = 900;

const PROCESSOR_GALLERY_IMAGES = [
  {
    src: "assets/img/1foto.jpg",
    alt: "Registro histórico 1 da evolução dos processadores.",
  },
  {
    src: "assets/img/2foto.jpg",
    alt: "Registro histórico 2 da evolução dos processadores.",
  },
  {
    src: "assets/img/3foto.jpg",
    alt: "Registro histórico 3 da evolução dos processadores.",
  },
  {
    src: "assets/img/4foto.jpg",
    alt: "Registro histórico 4 da evolução dos processadores.",
  },
  {
    src: "assets/img/5foto.jpg",
    alt: "Registro histórico 5 da evolução dos processadores.",
  },
  {
    src: "assets/img/6foto.jpg",
    alt: "Registro histórico 6 da evolução dos processadores.",
  },
  {
    src: "assets/img/7foto.jpg",
    alt: "Registro histórico 7 da evolução dos processadores.",
  },
  {
    src: "assets/img/8foto.jpg",
    alt: "Registro histórico 8 da evolução dos processadores.",
  },
];

const clampVolume = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
};

const clampUnitInterval = (value) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
};

const safePlay = (media) => {
  if (!media) {
    return;
  }
  const playPromise = media.play?.();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {
      /* autoplay restrictions ignored */
    });
  }
};

const isActivationKey = (event) =>
  event.key === "Enter" || event.key === " " || event.key === "Spacebar";

function ProcessorModule({
  id = "processadores",
  audioEnabled = false,
  volume = 0.7,
  onEnterSection,
  onLeaveSection,
}) {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const ambientAudioRef = useRef(null);
  const clickAudioRef = useRef(null);

  const [inView, setInView] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [flowActive, setFlowActive] = useState(false);
  const [parallaxProgress, setParallaxProgress] = useState(0);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const previousVisibilityRef = useRef(false);
  const videoLoadedRef = useRef(false);
  const timeoutsRef = useRef([]);
  const flowRafRef = useRef(null);

  const sectionStyles = useMemo(() => {
    const value = clampUnitInterval(parallaxProgress);
    return {
      "--parallax-progress": `${value}`,
    };
  }, [parallaxProgress]);

  // Lazy load video, track visibility, and derive parallax progress.
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

      setInView((prev) => (prev === isVisible ? prev : isVisible));

      const totalTravel = rect.height + viewportHeight;
      const offset = viewportHeight - rect.top;
      const progress = clampUnitInterval(offset / totalTravel);
      setParallaxProgress(progress);
    };

    let observer;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(() => evaluate());
        },
        {
          root: null,
          rootMargin: `${LOAD_MARGIN_PX}px 0px`,
          threshold: [0, 0.25, 0.5, 0.75, 1],
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

  // Sync audio elements with volume prop.
  useEffect(() => {
    const clamped = clampVolume(volume);
    if (ambientAudioRef.current) {
      ambientAudioRef.current.volume = clamped;
    }
    if (clickAudioRef.current) {
      clickAudioRef.current.volume = Math.max(0, Math.min(1, clamped * 0.5));
    }
  }, [volume]);

  // Handle section entry/exit plus audio state control.
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

  // Flag the video as ready once metadata is available.
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

  // Cleanup timers and media on unmount.
  useEffect(
    () => () => {
      timeoutsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      timeoutsRef.current = [];
      if (flowRafRef.current !== null) {
        window.cancelAnimationFrame(flowRafRef.current);
        flowRafRef.current = null;
      }
      videoRef.current?.pause();
      ambientAudioRef.current?.pause();
      clickAudioRef.current?.pause();
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
        return next >= PROCESSOR_GALLERY_IMAGES.length ? 0 : next;
      });
    }, 4200);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [inView]);

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

  const triggerFlow = () => {
    timeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    timeoutsRef.current = [];
    if (flowRafRef.current !== null) {
      window.cancelAnimationFrame(flowRafRef.current);
      flowRafRef.current = null;
    }
    setFlowActive(false);
    flowRafRef.current = window.requestAnimationFrame(() => {
      setFlowActive(true);
      const timeoutId = window.setTimeout(() => {
        setFlowActive(false);
        timeoutsRef.current = timeoutsRef.current.filter(
          (storedId) => storedId !== timeoutId
        );
      }, FLOW_LIFETIME_MS);
      timeoutsRef.current.push(timeoutId);
      flowRafRef.current = null;
    });
  };

  const handleBoardInteraction = (event) => {
    if (event.type === "keydown" && !isActivationKey(event)) {
      return;
    }
    playClickEffect();
    triggerFlow();
    if (event.type === "keydown") {
      event.preventDefault();
    }
  };

  const currentGalleryImage = PROCESSOR_GALLERY_IMAGES[galleryIndex];

  return (
    <section
      id={id}
      ref={sectionRef}
      className={`processor-section${inView ? " is-active" : ""}${
        videoReady ? " is-video-ready" : ""
      }${flowActive ? " has-flow" : ""}`}
      style={sectionStyles}
      aria-labelledby={`${id}-title`}
    >
      {/* Background fabrication line video with molten overlay */}
      <div className="processor-media-layer" aria-hidden="true">
        <video
          ref={videoRef}
          className="processor-background-video"
          playsInline
          loop
          muted
          preload="none"
        />
        <div className="processor-media-overlay" />
      </div>

      {/* Metallic pulses */}
      <div className="processor-pulse-layer" aria-hidden="true">
        <div className="processor-pulse processor-pulse--a" />
        <div className="processor-pulse processor-pulse--b" />
      </div>

      <div className="processor-content">
        <header className="processor-header">
          <div className="processor-header-text">
            <h2 id={`${id}-title`} className="processor-title">
              Núcleo Operacional: Processadores e Data Center
            </h2>
            <p className="processor-lead">
              A máquina nunca desacelera: pulsos térmicos, dados comprimidos e
              redundância total para manter o mundo conectado.
            </p>
          </div>
          <div
            className="processor-gallery-window"
            aria-live="polite"
            aria-label="Galeria visual dos processadores"
          >
            <div className="processor-gallery-frame">
              <img
                key={currentGalleryImage.src}
                className="processor-gallery-image"
                src={resolvePublicAsset(currentGalleryImage.src)}
                loading="lazy"
                alt={currentGalleryImage.alt}
              />
            </div>
            <div className="processor-gallery-indicators" role="presentation">
              {PROCESSOR_GALLERY_IMAGES.map((_, index) => (
                <span
                  key={index}
                  className={`processor-gallery-dot${
                    index === galleryIndex ? " is-active" : ""
                  }`}
                />
              ))}
            </div>
          </div>
        </header>

        <div className="processor-grid">
          <article
            className="processor-card chip-card"
            tabIndex={0}
            aria-label="Detalhar o chip moderno com brilho estrutural ativo."
          >
            <div className="chip-visual">
              <img
                src={resolvePublicAsset("assets/img/5-chip-moderno.jpg")}
                loading="lazy"
                alt="Chip moderno com trilhas em cobre aquecido."
              />
              <span className="chip-glow" aria-hidden="true" />
            </div>
            <div className="processor-card-body">
              <h3 className="processor-card-title">MicroscÃ³pico e Preciso</h3>
              <p className="processor-card-text">
                Trilhas microscÃ³picas vibram a gigahertz, mantendo instruÃ§Ãµes e
                caches sincronizados enquanto a temperatura oscila prÃ³ximo do
                limite seguro.
              </p>
            </div>
          </article>

          <div className="processor-card board-card">
            <button
              type="button"
              className="board-trigger"
              onClick={handleBoardInteraction}
              onKeyDown={handleBoardInteraction}
              aria-pressed={flowActive}
              aria-label="Ativar o fluxo de dados na placa matriz."
            >
              Fluxo de dados
            </button>
            <div className="board-visual">
              <img
                src={resolvePublicAsset("assets/img/6-placa-matris.jpg")}
                loading="lazy"
                alt="Placa matriz com barramentos iluminados."
              />
              <span
                className={`board-flow${flowActive ? " is-active" : ""}`}
                aria-hidden="true"
              />
            </div>
            <p className="processor-card-text">
              Ao comandar o fluxo, relÃ©s virtuais e barramentos liberam uma onda
              de dados comprimidos â o clique confirma a latÃªncia mÃ­nima.
            </p>
          </div>
        </div>

        {/* Capacity and scale panel */}
        <aside
          className="processor-capacity"
          aria-describedby={`${id}-scale`}
        >
          <div className="capacity-visual" aria-hidden="true">
            <video
              className="capacity-video"
              src={resolvePublicAsset("assets/videos/4-data-center.mp4")}
              autoPlay
              loop
              muted
              playsInline
            />
          </div>
          <div className="capacity-panel">
            <h3 id={`${id}-scale`} className="processor-card-title">
              Escala em Ritmo Contínuo
            </h3>
            <p className="processor-card-text">
              Racks paralelos sustentam o pulso de milhões de requisições por
              segundo, ajustando fontes redundantes e resfriamento evaporativo
              em sincronia.
            </p>
            <ul className="capacity-metrics">
              <li>
                <strong>4,2 ms</strong> tempo médio de resposta
              </li>
              <li>
                <strong>98%</strong> utilização sustentada
              </li>
              <li>
                <strong>24/7</strong> auto-recuperação de carga
              </li>
            </ul>
            <p className="sr-only">
              Parallax ativo: a imagem do data center aproxima-se conforme vocÃª
              explora a seÃ§Ã£o.
            </p>
          </div>
        </aside>
      </div>

      {/* Ambient machine audio and interaction click */}
      <audio
        ref={ambientAudioRef}
        className="processor-audio"
        src={AMBIENT_AUDIO_SOURCE}
        preload="auto"
        loop
        aria-hidden="true"
      />
      <audio
        ref={clickAudioRef}
        className="processor-audio"
        src={CLICK_AUDIO_SOURCE}
        preload="auto"
        aria-hidden="true"
      />
    </section>
  );
}

export default ProcessorModule;
