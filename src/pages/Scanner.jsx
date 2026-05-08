import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../icons';

const BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'];

function ViewfinderCorners() {
  const C = ({ style }) => (
    <div style={{
      position: 'absolute', width: 24, height: 24,
      border: '2px solid white', ...style,
    }}/>
  );
  return (
    <div style={{
      position: 'absolute', left: '8%', right: '8%',
      top: '50%', transform: 'translateY(-50%)',
      aspectRatio: '4 / 3',
    }}>
      <C style={{ top: 0, left: 0, borderRight: 'none', borderBottom: 'none', borderTopLeftRadius: 6 }}/>
      <C style={{ top: 0, right: 0, borderLeft: 'none', borderBottom: 'none', borderTopRightRadius: 6 }}/>
      <C style={{ bottom: 0, left: 0, borderRight: 'none', borderTop: 'none', borderBottomLeftRadius: 6 }}/>
      <C style={{ bottom: 0, right: 0, borderLeft: 'none', borderTop: 'none', borderBottomRightRadius: 6 }}/>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
        overflow: 'hidden', borderRadius: 6,
      }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 2,
          background: 'linear-gradient(to right, transparent, var(--primary), transparent)',
          animation: 'scan-line 2.4s ease-in-out infinite',
        }}/>
      </div>
    </div>
  );
}

export function Scanner() {
  const nav = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);
  const navigatedRef = useRef(false);

  const [supported, setSupported] = useState(null); // null = checking, true/false
  const [error, setError] = useState(null);
  const [showPaste, setShowPaste] = useState(false);
  const [manualEan, setManualEan] = useState('');
  const [lastDetected, setLastDetected] = useState(null);

  // Detection loop
  useEffect(() => {
    let mounted = true;

    async function start() {
      // Check BarcodeDetector availability
      const hasDetector = 'BarcodeDetector' in window;
      if (!hasDetector) {
        setSupported(false);
        setShowPaste(true);
        return;
      }

      try {
        // Some browsers need to query supported formats first
        const formats = await window.BarcodeDetector.getSupportedFormats?.() ?? [];
        const useFormats = BARCODE_FORMATS.filter(f => formats.length === 0 || formats.includes(f));
        detectorRef.current = new window.BarcodeDetector({ formats: useFormats.length ? useFormats : BARCODE_FORMATS });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setSupported(true);
        loop();
      } catch (e) {
        console.warn('Scanner init failed:', e);
        setSupported(false);
        setError(e?.name === 'NotAllowedError'
          ? 'Accès caméra refusé. Vous pouvez saisir l\'EAN manuellement.'
          : 'Caméra indisponible. Saisie manuelle activée.');
        setShowPaste(true);
      }
    }

    async function loop() {
      if (!mounted || !detectorRef.current || !videoRef.current) return;
      try {
        const codes = await detectorRef.current.detect(videoRef.current);
        if (codes && codes.length > 0 && !navigatedRef.current) {
          const ean = codes[0].rawValue;
          if (ean && /^\d{8,13}$/.test(ean)) {
            setLastDetected(ean);
            navigatedRef.current = true;
            // Small UI feedback delay before nav
            setTimeout(() => nav(`/p/${ean}`), 350);
            return;
          }
        }
      } catch (e) {
        // detector.detect can throw on bad frames — swallow and keep going
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    start();

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [nav]);

  const submitManual = (e) => {
    e?.preventDefault();
    const ean = manualEan.trim();
    if (/^\d{8,13}$/.test(ean)) {
      nav(`/p/${ean}`);
    } else {
      setError('EAN invalide — 8 à 13 chiffres requis.');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Camera background */}
      {supported && (
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%', objectFit: 'cover',
          }}
        />
      )}

      {/* Dim overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: supported ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.85)',
      }}/>

      {/* Viewfinder */}
      {supported && !lastDetected && <ViewfinderCorners/>}

      {/* Top bar — close + paste toggle */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '12px 12px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 10,
      }}>
        <button
          onClick={() => nav('/')}
          aria-label="Fermer"
          style={{
            width: 40, height: 40, borderRadius: 99,
            background: 'rgba(255,255,255,0.14)', border: 'none', cursor: 'pointer',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <Icon.Close s={18} c="white"/>
        </button>
        <button
          onClick={() => setShowPaste(s => !s)}
          style={{
            height: 36, padding: '0 14px', borderRadius: 18,
            background: 'rgba(255,255,255,0.14)', border: 'none', cursor: 'pointer',
            color: 'white', fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
          }}>
          {showPaste ? 'Caméra' : 'Saisir EAN'}
        </button>
      </div>

      {/* Hint / status */}
      {supported && !showPaste && !lastDetected && (
        <div style={{
          position: 'absolute', bottom: 60, left: 0, right: 0,
          textAlign: 'center', color: 'rgba(255,255,255,0.85)',
          fontSize: 13, padding: '0 24px', zIndex: 10,
        }}>
          Pointez vers le code-barres
        </div>
      )}

      {lastDetected && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.7)', color: 'white',
          padding: '14px 22px', borderRadius: 12,
          fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 500,
          animation: 'detected-pop .35s cubic-bezier(.2,.8,.25,1)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Icon.Check s={18} c="var(--success)"/>
          <span>{lastDetected}</span>
        </div>
      )}

      {/* Manual EAN paste form */}
      {showPaste && (
        <form
          onSubmit={submitManual}
          style={{
            position: 'absolute', left: 16, right: 16, bottom: 24,
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 14, padding: 14,
            display: 'flex', flexDirection: 'column', gap: 10,
            zIndex: 10,
          }}>
          <label style={{
            fontSize: 11, fontWeight: 500, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--ink-4)',
          }}>Saisir / coller l'EAN</label>
          <input
            value={manualEan}
            onChange={(e) => setManualEan(e.target.value.replace(/\D/g, ''))}
            placeholder="3017624999999"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            style={{
              fontFamily: 'var(--font-mono)', font: '500 18px/1 var(--font-sans)',
              height: 44, padding: '0 12px',
              border: '1px solid var(--hairline-strong)',
              borderRadius: 8, background: 'var(--canvas)',
              color: 'var(--charcoal)', width: '100%', outline: 'none',
              letterSpacing: '0.04em',
            }}/>
          {error && (
            <div style={{ fontSize: 12, color: 'var(--err)' }}>{error}</div>
          )}
          <button
            type="submit"
            disabled={!/^\d{8,13}$/.test(manualEan.trim())}
            className="btn btn-primary"
            style={{
              height: 44, justifyContent: 'center',
              opacity: /^\d{8,13}$/.test(manualEan.trim()) ? 1 : 0.5,
            }}>
            Rechercher
          </button>
        </form>
      )}

      {/* Init state */}
      {supported === null && (
        <div style={{
          position: 'absolute', top: '50%', left: 0, right: 0,
          textAlign: 'center', color: 'white', fontSize: 13,
        }}>
          Initialisation de la caméra…
        </div>
      )}
    </div>
  );
}
