import { useCallback, useEffect, useMemo, useState } from "react";
import QuantumModule from "./modules/QuantumModule";
import ProcessorModule from "./modules/ProcessorModule";
import ClassicModule from "./modules/ClassicModule";
import "./App.css";
import geminiIcon from "./assets/icons/gemini.svg";
import chatgptIcon from "./assets/icons/chatgpt.svg";
import grokIcon from "./assets/icons/grok.svg";

function App() {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [activeSection, setActiveSection] = useState("quantica");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleAudio = useCallback(() => {
    setAudioEnabled((prev) => !prev);
    setIsMobileMenuOpen(false);
  }, []);

  const handleVolumeChange = useCallback((event) => {
    const nextValue = Number.parseFloat(event.target.value);
    if (Number.isNaN(nextValue)) {
      return;
    }
    setVolume(Math.min(1, Math.max(0, nextValue)));
  }, []);

  const headerStatus = useMemo(
    () => (audioEnabled ? "\u00C1udio ligado" : "\u00C1udio desligado"),
    [audioEnabled]
  );

  const sections = useMemo(
    () => [
      { id: "quantica", label: "Qu\u00E2ntica" },
      { id: "processadores", label: "Processadores" },
      { id: "valvulas", label: "V\u00E1lvulas" },
    ],
    []
  );

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const handleEnter = useCallback(() => {
    // Placeholder for future global telemetry or tracking.
  }, []);

  const handleLeave = useCallback(() => {
    // Placeholder for global cleanup reactions.
  }, []);

  const scrollToSection = useCallback((targetId) => {
    const element = document.getElementById(targetId);
    if (!element) {
      return;
    }
    const headerEl = document.querySelector(".app-header");
    const headerHeight = headerEl ? headerEl.offsetHeight : 0;
    const elementTop =
      element.getBoundingClientRect().top + window.scrollY - headerHeight + 8;

    window.scrollTo({
      top: elementTop < 0 ? 0 : elementTop,
      behavior: "smooth",
    });
  }, []);

  const handleNavClick = useCallback(
    (targetId) => {
      scrollToSection(targetId);
      setIsMobileMenuOpen(false);
    },
    [scrollToSection]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible && visible.target?.id) {
          setActiveSection((prev) =>
            prev === visible.target.id ? prev : visible.target.id
          );
        }
      },
      {
        root: null,
        rootMargin: "-45% 0px -45% 0px",
        threshold: [0, 0.2, 0.4, 0.6, 0.8, 1],
      }
    );

    const elements = sections
      .map(({ id }) => document.getElementById(id))
      .filter((node) => node);

    elements.forEach((node) => observer.observe(node));

    return () => {
      elements.forEach((node) => observer.unobserve(node));
      observer.disconnect();
    };
  }, [sections]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return undefined;
    }
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const headerContentId = "app-header-content";

  return (
    <div className="app-shell">
      <header className={`app-header${isMobileMenuOpen ? " is-menu-open" : ""}`}>
        <div className="header-bar">
          <div className="header-brand header-brand--mobile">
            <span className="brand-mark">{"Evolu\u00E7\u00E3o Quantum.AI"}</span>
            <span className="brand-status" aria-live="polite">
              {headerStatus}
            </span>
          </div>
          <button
            type="button"
            className={`mobile-menu-toggle${isMobileMenuOpen ? " is-open" : ""}`}
            onClick={toggleMobileMenu}
            aria-label={
              isMobileMenuOpen ? "Fechar menu principal" : "Abrir menu principal"
            }
            aria-expanded={isMobileMenuOpen}
            aria-controls={headerContentId}
          >
            <span className="mobile-menu-bar" aria-hidden="true" />
          </button>
        </div>
        <div
          id={headerContentId}
          className={`header-content${isMobileMenuOpen ? " is-open" : ""}`}
        >
          <div className="header-brand header-brand--desktop">
            <span className="brand-mark">{"Evolu\u00E7\u00E3o Quantum.AI"}</span>
            <span className="brand-status" aria-live="polite">
              {headerStatus}
            </span>
          </div>
          <nav className="header-nav" aria-label={"Navegação das seções"}>
            <div className="nav-links">
              {sections.map(({ id: sectionId, label }) => {
                const sanitized = label.replace(/\|/g, "").trim();
                return (
                  <button
                    key={sectionId}
                    type="button"
                    className={`nav-button${
                      activeSection === sectionId ? " is-active" : ""
                    }`}
                    onClick={() => handleNavClick(sectionId)}
                    aria-current={activeSection === sectionId ? "true" : undefined}
                    aria-label={`Ir para a seção ${sanitized}`}
                  >
                    <span className="nav-button-inner">{sanitized}</span>
                  </button>
                );
              })}
            </div>
          </nav>
          <nav className="header-controls" aria-label={"Controles globais de \u00E1udio"}>
            <button
              type="button"
              onClick={toggleAudio}
              className="header-button"
              aria-pressed={audioEnabled}
            >
              {audioEnabled ? "Desativar \u00E1udio" : "Ativar \u00E1udio"}
            </button>
            <label className="volume-control">
              <span className="volume-label">Volume</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                aria-valuemin={0}
                aria-valuemax={1}
                aria-valuenow={Number(volume.toFixed(1))}
                aria-label="Volume global"
              />
            </label>
          </nav>
        </div>
      </header>

      <main>
        <QuantumModule
          id="quantica"
          audioEnabled={audioEnabled}
          volume={volume}
          onEnterSection={handleEnter}
          onLeaveSection={handleLeave}
        />
        <ProcessorModule
          id="processadores"
          audioEnabled={audioEnabled}
          volume={volume}
          onEnterSection={handleEnter}
          onLeaveSection={handleLeave}
        />
        <ClassicModule
          id="valvulas"
          audioEnabled={audioEnabled}
          volume={volume}
          onEnterSection={handleEnter}
          onLeaveSection={handleLeave}
        />
      </main>
      <footer className="app-footer">
        <div className="footer-grid" aria-hidden="true" />
        <div className="footer-content">
          <div className="footer-line">
            <div className="footer-line-col">
              <h3 className="footer-heading">{"Colabora\u00E7\u00F5es"}</h3>
              <ul className="footer-list">
                <li>Gemini (Google)</li>
                <li>ChatGPT (OpenAI)</li>
                <li>Grok (xAI)</li>
              </ul>
            </div>
            <div className="footer-line-col footer-line-col--center">
              <h4 className="footer-text footer-signature">
                &copy; 15/02/1946 Anderson J. Oliveira
              </h4>
            </div>
            <div className="footer-line-col footer-line-col--links">
              <ul className="footer-link-list">
                <li className="footer-link-item">
                  <a
                    href="https://gemini.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="footer-link"
                  >
                    <span className="footer-link-label">
                      <span className="footer-link-name">Gemini</span>
                      <span className="footer-link-note">com fotos</span>
                    </span>
                    <img src={geminiIcon} alt="" className="footer-icon" aria-hidden="true" />
                  </a>
                </li>
                <li className="footer-link-item">
                  <a
                    href="https://chat.openai.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="footer-link"
                  >
                    <span className="footer-link-label">
                      <span className="footer-link-name">ChatGPT</span>
                      <span className="footer-link-note">{"colaboração"}</span>
                    </span>
                    <img src={chatgptIcon} alt="" className="footer-icon" aria-hidden="true" />
                  </a>
                </li>
                <li className="footer-link-item">
                  <a
                    href="https://grok.x.ai/"
                    target="_blank"
                    rel="noreferrer"
                    className="footer-link"
                  >
                    <span className="footer-link-label">
                      <span className="footer-link-name">Grok</span>
                      <span className="footer-link-note">{"com v\u00EDdeos"}</span>
                    </span>
                    <img src={grokIcon} alt="" className="footer-icon" aria-hidden="true" />
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;















