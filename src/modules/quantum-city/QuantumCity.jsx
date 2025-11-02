/**
 * QuantumCity.jsx
 * React wrapper that lazy-loads the Phaser experience and exposes
 * accessible status updates while keeping the simulation em silêncio.
 */
import { useEffect, useRef, useState } from "react";
import "./quantum-city.css";
import { getAbsoluteBaseUrl } from "../../utils/baseUrl";

const CITY_BACKGROUND_URL = `${getAbsoluteBaseUrl()}phaser/cidade-fundo.jpg`;

function QuantumCity({ audioEnabled = false, volume = 0.8 }) {
  const wrapperRef = useRef(null);
  const containerRef = useRef(null);
  const ariaRef = useRef(null);
  const gameHandleRef = useRef(null);
  const observerRef = useRef(null);
  const intersectingRef = useRef(false);

  const [statusMessage, setStatusMessage] = useState(
    "Preparando a Cidade Quantica..."
  );
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const container = containerRef.current;
    if (!wrapper || !container) {
      return undefined;
    }

    let cancelled = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        intersectingRef.current = entry.isIntersecting;
        setIsVisible(entry.isIntersecting);
        const handle = gameHandleRef.current;
        if (!handle) {
          return;
        }
        if (entry.isIntersecting) {
          handle.resume();
        } else {
          handle.pause();
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(wrapper);
    observerRef.current = observer;

    const loadGame = async () => {
      try {
        setIsLoading(true);
        setStatusMessage("Carregando Cidade Quantica...");
        const { default: mountPhaserCity } = await import(
          "../../phaser/PhaserCityGame.js"
        );
        if (cancelled) {
          return;
        }
        const handle = mountPhaserCity(container, {
          pixelArt: true,
          mute: true,
          onStatusChange: (message) => {
            if (cancelled) {
              return;
            }
            setStatusMessage(message);
            if (ariaRef.current) {
              ariaRef.current.textContent = message;
            }
          },
        });
        gameHandleRef.current = handle;
        setIsLoading(false);
        if (!intersectingRef.current) {
          handle.pause();
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        setIsLoading(false);
        const fallbackMessage =
          "Nao foi possivel carregar a Cidade Quantica. Tente novamente.";
        setStatusMessage(fallbackMessage);
        if (ariaRef.current) {
          ariaRef.current.textContent = fallbackMessage;
        }
      }
    };

    loadGame();

    return () => {
      cancelled = true;
      observer.disconnect();
      observerRef.current = null;
      if (gameHandleRef.current) {
        gameHandleRef.current.destroy();
        gameHandleRef.current = null;
      }
    };
  }, []);

  return (
    <section
      ref={wrapperRef}
      className={`qc-wrapper${isVisible ? " qc-wrapper--active" : ""}`}
      style={{ "--qc-bg": `url(${CITY_BACKGROUND_URL})` }}
      aria-label="Cidade Quantica interativa em pixel art (experiencia silenciosa)."
    >
      <div
        ref={containerRef}
        className="qc-game"
        role="application"
        aria-hidden="false"
      />
      {isLoading && (
        <div className="qc-loader" aria-hidden="true">
          Carregando cidade...
        </div>
      )}
      <p ref={ariaRef} className="sr-only" aria-live="polite">
        {statusMessage}
      </p>
    </section>
  );
}

export default QuantumCity;


