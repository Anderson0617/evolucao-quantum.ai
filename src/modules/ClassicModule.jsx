/*
 * ClassicModule — usage:
 * import ClassicModule from "./modules/ClassicModule";
 * <ClassicModule id="valvulas" audioEnabled={audioOn} volume={masterVolume} />
 */
import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/classic.css";
import { resolvePublicAsset } from "../utils/assetPaths";

const VIDEO_SOURCE = resolvePublicAsset("assets/videos/valvula-acende.mp4");
const VIDEO_POSTER = resolvePublicAsset("assets/img/8-painel-antigo.jpg");
const AMBIENT_AUDIO_SOURCE = resolvePublicAsset("assets/audio/vintage.mp3");
const CLICK_AUDIO_SOURCE = resolvePublicAsset("assets/audio/click-rele.mp3");
const TRANSITION_AUDIO_SOURCE = resolvePublicAsset("assets/audio/conexao-antiga-na-web.mp3");

const LOAD_MARGIN_PX = 320;

const CLASSIC_GALLERY_IMAGES = [
  {
    src: "assets/img/01foto.jpg",
    alt: "Registro fotográfico 1 da evolução das válvulas.",
  },
  {
    src: "assets/img/02foto.jpg",
    alt: "Registro fotográfico 2 da evolução das válvulas.",
  },
  {
    src: "assets/img/03foto.jpg",
    alt: "Registro fotográfico 3 da evolução das válvulas.",
  },
  {
    src: "assets/img/04foto.jpg",
    alt: "Registro fotográfico 4 da evolução das válvulas.",
  },
  {
    src: "assets/img/05foto.jpg",
    alt: "Registro fotográfico 5 da evolução das válvulas.",
  },
  {
    src: "assets/img/06foto.jpg",
    alt: "Registro fotográfico 6 da evolução das válvulas.",
  },
  {
    src: "assets/img/07foto.jpg",
    alt: "Registro fotográfico 7 da evolução das válvulas.",
  },
  {
    src: "assets/img/08foto.jpg",
    alt: "Registro fotográfico 8 da evolução das válvulas.",
  },
];

const clampVolume = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
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
      /* autoplay guard ignored */
    });
  }
};

const isActivationKey = (event) =>
  event.key === "Enter" || event.key === " " || event.key === "Spacebar";

function ClassicModule({
  id = "valvulas",
  audioEnabled = false,
  volume = 0.6,
  onEnterSection,
  onLeaveSection,
}) {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const ambientAudioRef = useRef(null);
  const clickAudioRef = useRef(null);
  const transitionAudioRef = useRef(null);

  const [inView, setInView] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [bitOn, setBitOn] = useState(false);
  const [panelActive, setPanelActive] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const previousVisibilityRef = useRef(false);
  const videoLoadedRef = useRef(false);

  const sectionStyles = useMemo(
    () => ({
      "--bit-state": bitOn ? 1 : 0,
    }),
    [bitOn]
  );

  // Lazy load video and track viewport presence.
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

  // Apply volume props to audio elements.
  useEffect(() => {
    const clamped = clampVolume(volume);
    if (ambientAudioRef.current) {
      ambientAudioRef.current.volume = clamped;
    }
    if (clickAudioRef.current) {
      clickAudioRef.current.volume = Math.max(0, Math.min(1, clamped * 0.5));
    }
    if (transitionAudioRef.current) {
      transitionAudioRef.current.volume = Math.max(
        0,
        Math.min(1, clamped * 0.4)
      );
    }
  }, [volume]);

  // Manage entry/exit events and audio control.
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

  // Flag the video as ready for reveal styles.
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

  // Cleanup on unmount.
  useEffect(
    () => () => {
      videoRef.current?.pause();
      ambientAudioRef.current?.pause();
      clickAudioRef.current?.pause();
      transitionAudioRef.current?.pause();
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
        return next >= CLASSIC_GALLERY_IMAGES.length ? 0 : next;
      });
    }, 4200);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [inView]);

  const currentGalleryImage = CLASSIC_GALLERY_IMAGES[galleryIndex];

  const playClick = () => {
    if (!audioEnabled) {
      return;
    }
    const clickEl = clickAudioRef.current;
    if (clickEl) {
      clickEl.currentTime = 0;
      safePlay(clickEl);
    }
    const transitionEl = transitionAudioRef.current;
    if (transitionEl) {
      transitionEl.currentTime = 0;
      safePlay(transitionEl);
    }
  };

  const toggleBit = () => {
    setBitOn((prev) => !prev);
  };

  const handleSwitch = (event) => {
    if (event.type === "keydown" && !isActivationKey(event)) {
      return;
    }
    playClick();
    toggleBit();
    if (event.type === "keydown") {
      event.preventDefault();
    }
  };

  const switchLabel = bitOn ? "Ligado" : "Desligado";

  return (
    <section
      id={id}
      ref={sectionRef}
      className={`classic-section${inView ? " is-active" : ""}${
        videoReady ? " is-video-ready" : ""
      }${bitOn ? " bit-on" : ""}${panelActive ? " panel-active" : ""}`}
      style={sectionStyles}
      aria-labelledby={`${id}-title`}
    >
      {/* Warm valve cinematics with dust overlay */}
      <div className="classic-media-layer" aria-hidden="true">
        <video
          ref={videoRef}
          className="classic-background-video"
          playsInline
          loop
          muted
          preload="none"
          poster={VIDEO_POSTER}
        />
        <div className="classic-media-overlay" />
      </div>

      <div className="classic-content">
        <header className="classic-header">
          <div className="classic-header-text">
            <h2 id={`${id}-title`} className="classic-title">
              Sala de Controle: Era das Válvulas
            </h2>
            <p className="classic-lead">
              Cada bit responde ao toque humano: o brilho âmbar denuncia quando o
              circuito conduz ou repousa.
            </p>
            <p className="classic-bit-readout" aria-live="polite">
              Bit: {bitOn ? "1" : "0"}
            </p>
          </div>
          <div
            className="classic-gallery-window"
            aria-live="polite"
            aria-label="Galeria visual da era das válvulas"
          >
            <div className="classic-gallery-frame">
              <img
                key={currentGalleryImage.src}
                className="classic-gallery-image"
                src={resolvePublicAsset(currentGalleryImage.src)}
                loading="lazy"
                alt={currentGalleryImage.alt}
              />
            </div>
            <div className="classic-gallery-indicators" role="presentation">
              {CLASSIC_GALLERY_IMAGES.map((_, index) => (
                <span
                  key={index}
                  className={`classic-gallery-dot${
                    index === galleryIndex ? " is-active" : ""
                  }`}
                />
              ))}
            </div>
          </div>
        </header>

        {/* Interactive vintage hardware */}
        <div className="classic-grid">
          <div className="classic-card switch-card">
            <button
              type="button"
              className="switch-toggle"
              onClick={handleSwitch}
              onKeyDown={handleSwitch}
              aria-pressed={bitOn}
              aria-label={`Alternar bit clássico, estado atual ${switchLabel}`}
            >
              <span className="switch-label">{switchLabel}</span>
              <span className="switch-handle" aria-hidden="true" />
            </button>
            <div className="switch-annotation">
              <img
                src={resolvePublicAsset("assets/img/7-valvula.jpg")}
                loading="lazy"
                alt={`Válvula ${bitOn ? "acesa" : "apagada"} representando o estado do bit.`}
                className={`valve-visual${bitOn ? " valve-on" : ""}`}
              />
              <p className="classic-card-text">
                O filamento responde instantaneamente: ao fechar o circuito, o
                calor ilumina o vidro e o som do relé sela a decisão.
              </p>
            </div>
          </div>

          <article
            className="classic-card panel-card"
            tabIndex={0}
            onMouseEnter={() => setPanelActive(true)}
            onMouseLeave={() => setPanelActive(false)}
            onFocus={() => setPanelActive(true)}
            onBlur={() => setPanelActive(false)}
            aria-label="Painel antigo com indicadores que respondem ao toque."
          >
            <div className="panel-visual">
              <img
                src={resolvePublicAsset("assets/img/8-painel-antigo.jpg")}
                loading="lazy"
                alt="Painel vintage com mostradores analógicos e lâmpadas âmbar."
              />
              <span
                className={`panel-indicators${
                  panelActive ? " is-active" : ""
                }`}
                aria-hidden="true"
              />
            </div>
            <p className="classic-card-text">
              Ao aproximar-se, os indicadores brilham gradualmente, relembrando
              quando operações lógicas dependiam de chaves físicas.
            </p>
          </article>

          <article className="classic-card">
            <div className="classic-card-body">
              <h3 className="classic-card-title">Memória Registrada</h3>
              <p className="classic-card-text">
                Cada caractere digitado era gravado em rolamentos mecânicos.
                Confiabilidade vinha do ritmo humano, auditado som a som.
              </p>
              <img
                src={resolvePublicAsset("assets/img/9-vintage.jpg")}
                loading="lazy"
                alt="Máquina de escrever vintage, representando registros clássicos."
                className="typewriter-visual"
              />
            </div>
          </article>
        </div>
      </div>

      {/* Ambient noise bed and tactile feedback audio */}
      <audio
        ref={ambientAudioRef}
        className="classic-audio"
        src={AMBIENT_AUDIO_SOURCE}
        preload="auto"
        loop
        aria-hidden="true"
      />
      <audio
        ref={clickAudioRef}
        className="classic-audio"
        src={CLICK_AUDIO_SOURCE}
        preload="auto"
        aria-hidden="true"
      />
      <audio
        ref={transitionAudioRef}
        className="classic-audio"
        src={TRANSITION_AUDIO_SOURCE}
        preload="auto"
        aria-hidden="true"
      />
    </section>
  );
}

export default ClassicModule;







