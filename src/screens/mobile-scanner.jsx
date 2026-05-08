import React, { useState, useEffect } from 'react';
import { Icon } from '../icons';
import { Packshot } from '../primitives';

// Simulated camera background
export function CameraBG({ blur = 0 }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: `
        radial-gradient(120% 80% at 50% 30%, #2A2620 0%, #16140F 55%, #0A0908 100%),
        #0A0908
      `,
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.3,
        background: `
          linear-gradient(180deg, transparent 30%, rgba(120,90,60,0.18) 50%, transparent 70%),
          linear-gradient(90deg, transparent 0%, rgba(160,130,90,0.08) 50%, transparent 100%)
        `,
        filter: blur ? `blur(${blur}px)` : 'none',
      }}/>
      <div style={{
        position: 'absolute', top: '38%', left: '50%',
        transform: 'translateX(-50%) rotate(-1.5deg)',
        width: 220, height: 110, borderRadius: 4,
        background: 'linear-gradient(180deg, #C8B998 0%, #B5A584 100%)',
        boxShadow: '0 30px 60px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.08)',
        opacity: 0.55,
        filter: blur ? `blur(${blur * 0.5}px)` : 'none',
      }}>
        <div style={{
          position: 'absolute', bottom: 14, left: 18, right: 18, height: 36,
          background: `repeating-linear-gradient(90deg,
            #1a1611 0 2px, transparent 2px 4px,
            #1a1611 4px 5px, transparent 5px 8px,
            #1a1611 8px 11px, transparent 11px 13px,
            #1a1611 13px 14px, transparent 14px 17px)`,
          opacity: 0.7,
        }}/>
      </div>
    </div>
  );
}

// "Corners only" viewfinder
export function ViewfinderCorners({ w = 280, h = 160, c = '#fff', thickness = 2, len = 22, animated = false }) {
  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: w, height: h, pointerEvents: 'none',
    }}>
      {/* TL */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: len, height: len }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: len, height: thickness, background: c }}/>
        <div style={{ position: 'absolute', top: 0, left: 0, width: thickness, height: len, background: c }}/>
      </div>
      {/* TR */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: len, height: len }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: len, height: thickness, background: c }}/>
        <div style={{ position: 'absolute', top: 0, right: 0, width: thickness, height: len, background: c }}/>
      </div>
      {/* BL */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: len, height: len }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: len, height: thickness, background: c }}/>
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: thickness, height: len, background: c }}/>
      </div>
      {/* BR */}
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: len, height: len }}>
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: len, height: thickness, background: c }}/>
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: thickness, height: len, background: c }}/>
      </div>
      {animated && (
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${c}, transparent)`,
          animation: 'scan-line 1.6s ease-in-out infinite',
          boxShadow: `0 0 12px ${c}`,
        }}/>
      )}
    </div>
  );
}

// Variant A — Sobre
export function ScannerSobre({ onClose, onDetected, scanCount = 12, state = 'scanning' }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#0A0908', overflow: 'hidden',
    }}>
      <CameraBG/>

      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse 180px 110px at 50% 50%, transparent 0%, transparent 65%, rgba(0,0,0,0.5) 100%)`,
        pointerEvents: 'none',
      }}/>

      <div style={{
        position: 'absolute', top: 59, left: 0, right: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 14px',
      }}>
        <button onClick={onClose} style={{
          width: 38, height: 38, borderRadius: 99,
          background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(20px)',
        }}>
          <Icon.Close s={18} c="white"/>
        </button>
        <div style={{
          color: 'rgba(255,255,255,0.92)',
          fontSize: 13, fontWeight: 500,
          padding: '7px 14px',
          background: 'rgba(255,255,255,0.12)',
          backdropFilter: 'blur(20px)',
          borderRadius: 99,
          fontFamily: 'var(--font-mono)',
        }}>{scanCount} scannés</div>
        <button style={{
          width: 38, height: 38, borderRadius: 99,
          background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(20px)',
        }}>
          <Icon.Flash s={18} c="white"/>
        </button>
      </div>

      <ViewfinderCorners w={300} h={170} c="#fff" thickness={2.5} len={28} animated={state === 'scanning'}/>

      <div style={{
        position: 'absolute', bottom: 60, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: 13, fontWeight: 450,
          textAlign: 'center',
          padding: '8px 16px',
        }}>Cadrez le code-barres</div>
      </div>
    </div>
  );
}

// Variant B — Informative (chosen variant)
export function ScannerInformative({ onClose, scanCount = 12, lastScans = [], batchMode = false, onToggleBatch, lowConfidence = false, lowConfidenceEAN = '3033710065●●4', onConfirmLow, onRetry, onPasteEAN, showPaste = false, batchToast = null }) {
  const [paste, setPaste] = useState('');
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#0A0908', overflow: 'hidden',
    }}>
      <CameraBG/>

      <div style={{
        position: 'absolute', top: 59, left: 0, right: 0, zIndex: 10,
      }}>
        <div style={{
          padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)',
        }}>
          <button onClick={onClose} style={{
            width: 38, height: 38, borderRadius: 8,
            background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon.Close s={18} c="white"/>
          </button>
          <div style={{ flex: 1 }}>
            <div style={{
              color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>Session{batchMode && ' · Rafale'}</div>
            <div style={{
              color: '#fff', fontSize: 14, fontWeight: 500,
              fontFamily: 'var(--font-mono)',
            }}>
              {scanCount} scannés · 14h32 démarrée
            </div>
          </div>
          <button onClick={onToggleBatch} title="Mode rafale" style={{
            height: 32, padding: '0 10px', borderRadius: 8,
            background: batchMode ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
            border: 'none', cursor: 'pointer',
            color: 'white', display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
            letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: 99,
              background: batchMode ? 'white' : 'rgba(255,255,255,0.4)',
            }}/>
            Rafale
          </button>
          <button style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon.Flash s={16} c="white"/>
          </button>
        </div>
      </div>

      <ViewfinderCorners w={300} h={170} c={lowConfidence ? 'oklch(0.72 0.16 70)' : '#fff'} thickness={2.5} len={28} animated={!lowConfidence}/>

      {lowConfidence && (
        <div style={{
          position: 'absolute', top: 'calc(50% + 100px)', left: 14, right: 14,
          padding: '14px 14px 12px',
          background: 'rgba(20,18,14,0.85)',
          backdropFilter: 'blur(20px)',
          borderRadius: 12,
          border: '0.5px solid rgba(255,255,255,0.1)',
          color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 18, height: 18, borderRadius: 99,
              background: 'oklch(0.72 0.16 70)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon.Warn s={11} c="#1a1611" w={2.2}/>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'oklch(0.85 0.12 70)' }}>Lecture incertaine</span>
          </div>
          <div className="mono" style={{ fontSize: 17, fontWeight: 500, letterSpacing: '0.04em', marginBottom: 10 }}>
            {lowConfidenceEAN}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onRetry} style={{
              flex: 1, height: 36, borderRadius: 8,
              background: 'rgba(255,255,255,0.1)', border: 'none',
              color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'inherit',
            }}>Rescanner</button>
            <button onClick={onConfirmLow} style={{
              flex: 2, height: 36, borderRadius: 8,
              background: 'white', border: 'none',
              color: '#1a1611', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}><Icon.Check s={13} c="#1a1611" w={2.2}/> Confirmer</button>
          </div>
        </div>
      )}

      {batchToast && (
        <div style={{
          position: 'absolute', top: 'calc(50% - 110px)', left: '50%', transform: 'translateX(-50%)',
          padding: '8px 14px', borderRadius: 99,
          background: 'oklch(0.55 0.13 155)', color: 'white',
          fontSize: 13, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          animation: 'detected-pop .35s cubic-bezier(.2,.8,.25,1)',
        }}>
          <Icon.Check s={14} c="white" w={2.5}/>
          <span style={{ fontWeight: 600 }}>+1</span>
          <span style={{ opacity: 0.85 }}>{batchToast}</span>
        </div>
      )}

      {!lowConfidence && !batchToast && (
        <div style={{
          position: 'absolute', top: 'calc(50% - 110px)', left: '50%', transform: 'translateX(-50%)',
          padding: '5px 12px', borderRadius: 99,
          background: 'rgba(255,255,255,0.12)',
          backdropFilter: 'blur(20px)',
          color: 'rgba(255,255,255,0.85)',
          fontSize: 12, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: 99, background: 'oklch(0.75 0.18 145)',
            animation: 'pulse-ring 1.4s ease-out infinite',
          }}/>
          {batchMode ? 'Rafale active · scanne en continu' : 'Détection active'}
        </div>
      )}

      {showPaste ? (
        <div style={{
          position: 'absolute', bottom: 50, left: 14, right: 14,
        }}>
          <div style={{
            color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            marginBottom: 8, padding: '0 4px',
          }}>Ou colle un EAN</div>
          <form onSubmit={(e) => { e.preventDefault(); if (paste) { onPasteEAN?.(paste); setPaste(''); } }}
            style={{
              display: 'flex', gap: 6,
              padding: 6, borderRadius: 12,
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              border: '0.5px solid rgba(255,255,255,0.15)',
            }}>
            <input
              value={paste} onChange={(e) => setPaste(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="13 chiffres"
              maxLength={13}
              style={{
                flex: 1, height: 36, padding: '0 10px',
                background: 'transparent', border: 'none', outline: 'none',
                color: 'white', fontFamily: 'var(--font-mono)', fontSize: 14,
                letterSpacing: '0.04em',
              }}
            />
            <button type="submit" disabled={paste.length < 8} style={{
              height: 36, padding: '0 14px', borderRadius: 8,
              background: paste.length >= 8 ? 'white' : 'rgba(255,255,255,0.2)',
              color: paste.length >= 8 ? '#1a1611' : 'rgba(255,255,255,0.4)',
              border: 'none', fontSize: 13, fontWeight: 500,
              cursor: paste.length >= 8 ? 'pointer' : 'default',
              fontFamily: 'inherit',
            }}>Chercher</button>
          </form>
        </div>
      ) : (
        <div style={{
          position: 'absolute', bottom: 50, left: 0, right: 0,
          padding: '0 14px',
        }}>
          <div style={{
            color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            marginBottom: 8, padding: '0 4px',
          }}>3 derniers scans</div>
          <div style={{
            display: 'flex', gap: 8, overflowX: 'auto',
          }} className="no-sb">
            {lastScans.slice(0, 4).map((p) => (
              <div key={p.ean} style={{
                flex: '0 0 auto', width: 120,
                padding: 8, borderRadius: 10,
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <Packshot product={p} size={36} radius={4} hint={false}/>
                <div style={{
                  color: 'rgba(255,255,255,0.95)', fontSize: 11, fontWeight: 500,
                  lineHeight: 1.3,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>{p.title}</div>
                <div style={{
                  color: 'rgba(255,255,255,0.5)', fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                }}>{p.ean.slice(-6)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Variant C — Minimaliste
export function ScannerMinimal({ onClose, scanCount = 12 }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#0A0908', overflow: 'hidden',
    }}>
      <CameraBG blur={0.5}/>
      <button onClick={onClose} style={{
        position: 'absolute', top: 65, right: 14, zIndex: 10,
        width: 32, height: 32, borderRadius: 99,
        background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer',
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon.Close s={16} c="white"/>
      </button>
      <ViewfinderCorners w={320} h={180} c="var(--accent-2)" thickness={1.5} len={36} animated/>
      <div style={{
        position: 'absolute', top: 65, left: 14, zIndex: 10,
        height: 32, padding: '0 12px',
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        borderRadius: 99,
        display: 'flex', alignItems: 'center', gap: 8,
        color: 'rgba(255,255,255,0.85)',
        fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--accent-2)' }}/>
        {scanCount}
      </div>
      <div style={{
        position: 'absolute', bottom: 60, left: 0, right: 0,
        textAlign: 'center',
        color: 'rgba(255,255,255,0.55)', fontSize: 11,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        fontWeight: 500,
      }}>cadrez · détection auto</div>
    </div>
  );
}
