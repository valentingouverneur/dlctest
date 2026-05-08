import React, { useState, useEffect } from 'react';
import { DLC_PRODUCTS, DLC_DUE } from './data';
import { DesignCanvas, DCSection, DCArtboard } from './design-canvas';
import { IOSDevice } from './ios-frame';
import { useTweaks, TweaksPanel, TweakSection, TweakRadio } from './tweaks-panel';
import { CatalogueMobile } from './screens/mobile-catalogue';
import { ScannerInformative, CameraBG } from './screens/mobile-scanner';
import { Sheet, ProductSheetContent, FicheMobile, NotFoundMobile, MultipleResultsMobile, BurgerMobile, DLCMobile } from './screens/mobile-sheet';
import { CatalogueDesktop } from './screens/desktop';
import { MobileProto } from './proto';
import { Icon } from './icons';

const TWEAK_DEFAULTS = {
  accent: 'purple',
  font: 'geist',
  density: 'standard',
};

const FONTS = {
  inter: { stack: "'Inter', -apple-system, system-ui, sans-serif", label: 'Inter (Notion Sans)' },
  geist: { stack: "'Geist', -apple-system, system-ui, sans-serif", label: 'Geist' },
};

const ACCENTS = {
  purple: { c: '#5645d4', c2: '#4534b3', soft: '#e6e0f5', label: 'Notion Purple' },
  navy:   { c: '#0a1530', c2: '#1a2a52', soft: '#dcecfa', label: 'Navy' },
  pink:   { c: '#ff64c8', c2: '#a02e6d', soft: '#fde0ec', label: 'Pink' },
  green:  { c: '#1aae39', c2: '#0d7a25', soft: '#d9f3e1', label: 'Green' },
};

export default function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const a = ACCENTS[t.accent] || ACCENTS.purple;
  const f = FONTS[t.font] || FONTS.geist;

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', a.c);
    document.documentElement.style.setProperty('--accent-2', a.c2);
    document.documentElement.style.setProperty('--accent-soft', a.soft);
    document.documentElement.style.setProperty('--font-sans', f.stack);
    document.body.style.fontFamily = f.stack;
  }, [t.accent, t.font, a.c, a.c2, a.soft, f.stack]);

  // Desktop catalogue state
  const [deskSel, setDeskSel] = useState('3033710065684');
  const [deskEditing, setDeskEditing] = useState(false);
  const [deskNav, setDeskNav] = useState('catalogue');

  // Mobile fiche standalone state (P2.7)
  const [ficheStandalone] = useState(DLC_PRODUCTS[2]);

  const mFrame = (children) => (
    <IOSDevice width={390} height={780}>
      <div className="dlc-root" style={{ position: 'absolute', inset: 0, fontFamily: 'var(--font-sans)' }}>{children}</div>
    </IOSDevice>
  );

  return (
    <div className="dlc-root">
      <DesignCanvas>

        {/* ── INTRO ─────────────────────────────────────────── */}
        <DCSection id="intro" title="DLC v2 — Hi-fi designs" subtitle="Outil interne · gestion DLC + préparation affiches Factory · prototype click-through">
          <DCArtboard id="brief" label="Brief & système" width={520} height={780}>
            <div className="dlc-root" style={{ width: '100%', height: '100%', background: 'var(--bg)', padding: 32, display: 'flex', flexDirection: 'column', gap: 18, fontFamily: 'var(--font-sans)' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>DLC · v2</div>
                <h1 style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.1, margin: '8px 0 6px', letterSpacing: '-0.02em' }}>Outil utilitaire pour rayonnistes.</h1>
                <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--ink-3)', margin: 0 }}>
                  Pont entre le rayon et Factory. Scanner EAN → fiche article → copier vers Factory.
                  30 étiquettes d'affilée, fluide, sans friction.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { k: 'Couleur', v: <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--ink)' }}/>
                    <div style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--accent)' }}/>
                    <div style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--bg)', border: '0.5px solid var(--line-strong)' }}/>
                    <div style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--surface)', border: '0.5px solid var(--line-strong)' }}/>
                  </div> },
                  { k: 'Type', v: <div style={{ fontSize: 13 }}>{f.label}</div> },
                  { k: 'Densité', v: <div style={{ fontSize: 13 }}>38px row · 8px radius</div> },
                  { k: 'Accent', v: <div style={{ fontSize: 13 }}>{a.label}</div> },
                ].map(o => (
                  <div key={o.k} style={{
                    background: 'var(--surface)', border: '0.5px solid var(--line)',
                    borderRadius: 8, padding: '10px 12px',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 6 }}>{o.k}</div>
                    {o.v}
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '0.5px solid var(--line)', paddingTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 8 }}>Ce qu'il y a dans le canvas</div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--ink-2)' }}>
                  <div><span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 11, marginRight: 6 }}>P1</span>Catalogue mobile · Scanner ×4 états · Fiche article · Catalogue desktop split-view</div>
                  <div><span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 11, marginRight: 6 }}>P2</span>EAN non trouvé · Disambiguation · Fiche depuis liste · Édition desktop</div>
                  <div><span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 11, marginRight: 6 }}>P3</span>Burger menu · Calendrier DLC</div>
                </div>
              </div>

              <div style={{ flex: 1 }}/>
              <div style={{ fontSize: 12, color: 'var(--ink-4)', borderTop: '0.5px solid var(--line)', paddingTop: 12 }}>
                <strong style={{ color: 'var(--ink-3)', fontWeight: 500 }}>Interactif :</strong> sur "P1 · Mobile prototype", clique le bouton scanner — auto-détection après 2s, swipe vers haut sur la sheet.
                Toggle "Tweaks" en haut pour cycler la couleur d'accent.
              </div>
            </div>
          </DCArtboard>

          <DCArtboard id="proto" label="P1 · Mobile prototype (interactif)" width={420} height={820}>
            <div style={{ padding: 12, display: 'flex', justifyContent: 'center' }}>
              <IOSDevice width={390} height={780}>
                <div className="dlc-root" style={{ position: 'absolute', inset: 0 }}>
                  <MobileProto autoScan={true}/>
                </div>
              </IOSDevice>
            </div>
          </DCArtboard>
        </DCSection>

        {/* ── P1 mobile screens ─────────────────────────────── */}
        <DCSection id="p1-mobile" title="P1 · Mobile" subtitle="Catalogue → Scanner → Sheet">
          <DCArtboard id="m-cat" label="P1.1 Catalogue (home)" width={420} height={820}>
            <div style={{ padding: 12, display: 'flex', justifyContent: 'center' }}>
              {mFrame(<CatalogueMobile products={DLC_PRODUCTS} onOpenProduct={() => {}} onScan={() => {}} onMenu={() => {}} scanCount={12}/>)}
            </div>
          </DCArtboard>

          <DCArtboard id="m-fiche" label="P1.3 Fiche (sheet from scan)" width={420} height={820}>
            <div style={{ padding: 12, display: 'flex', justifyContent: 'center' }}>
              {mFrame(
                <div style={{ position: 'absolute', inset: 0 }}>
                  <CameraBG blur={2}/>
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}/>
                  <button style={{
                    position: 'absolute', top: 65, right: 14, zIndex: 40,
                    width: 38, height: 38, borderRadius: 99,
                    background: 'rgba(255,255,255,0.12)', border: 'none',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><Icon.Close s={18} c="white"/></button>
                  <Sheet animate={false}>
                    <ProductSheetContent product={DLC_PRODUCTS[0]} fromScan/>
                  </Sheet>
                </div>
              )}
            </div>
          </DCArtboard>
        </DCSection>

        {/* ── Scanner ───────────────────────────── */}
        <DCSection id="scanner-variants" title="P1.2 · Scanner" subtitle="Caméra plein écran. Détection auto + rafale + lecture incertaine + paste EAN.">
          <DCArtboard id="sc-b" label="Standard" width={420} height={820}>
            <div style={{ padding: 12, display: 'flex', justifyContent: 'center' }}>
              {mFrame(<ScannerInformative scanCount={12} lastScans={DLC_PRODUCTS.slice(0, 4)}/>)}
            </div>
          </DCArtboard>
          <DCArtboard id="sc-batch" label="Mode rafale" width={420} height={820}>
            <div style={{ padding: 12, display: 'flex', justifyContent: 'center' }}>
              {mFrame(<ScannerInformative scanCount={13} batchMode batchToast="Cordon Bleu de Volaille x4" lastScans={DLC_PRODUCTS.slice(0, 4)}/>)}
            </div>
          </DCArtboard>
          <DCArtboard id="sc-lowconf" label="Lecture incertaine" width={420} height={820}>
            <div style={{ padding: 12, display: 'flex', justifyContent: 'center' }}>
              {mFrame(<ScannerInformative scanCount={12} lowConfidence lowConfidenceEAN="3033710065●●4" lastScans={DLC_PRODUCTS.slice(0, 4)}/>)}
            </div>
          </DCArtboard>
          <DCArtboard id="sc-paste" label="Coller EAN" width={420} height={820}>
            <div style={{ padding: 12, display: 'flex', justifyContent: 'center' }}>
              {mFrame(<ScannerInformative scanCount={12} showPaste/>)}
            </div>
          </DCArtboard>
        </DCSection>

        {/* ── P1 desktop ────────────────────────────────────── */}
        <DCSection id="p1-desktop" title="P1.4 · Desktop — Catalogue split view" subtitle="Sidebar · tableau dense · panel fiche. Densité Notion (38px).">
          <DCArtboard id="d-cat" label="Catalogue desktop" width={1280} height={800}>
            <div style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--bg)', overflow: 'hidden', borderRadius: 4 }}>
              <CatalogueDesktop
                products={DLC_PRODUCTS}
                selectedId={deskSel}
                onSelect={setDeskSel}
                editing={false}
                onEdit={() => setDeskEditing(true)}
                onCloseDetail={() => setDeskSel(null)}
                activeNav={deskNav}
                onNav={setDeskNav}
                density={t.density}
              />
            </div>
          </DCArtboard>
        </DCSection>

        {/* ── P2 mobile ─────────────────────────────────────── */}
        <DCSection id="p2-mobile" title="P2 · États importants (mobile)" subtitle="Erreurs, ambiguïté, accès depuis la liste">
          <DCArtboard id="m-nf" label="P2.5 EAN non trouvé" width={420} height={820}>
            <div style={{ padding: 12, display: 'flex', justifyContent: 'center' }}>
              {mFrame(<NotFoundMobile ean="3017624999999" onClose={() => {}} onCreate={() => {}}/>)}
            </div>
          </DCArtboard>

          <DCArtboard id="m-multi" label="P2.6 Plusieurs résultats" width={420} height={820}>
            <div style={{ padding: 12, display: 'flex', justifyContent: 'center' }}>
              {mFrame(<MultipleResultsMobile
                ean="3033710065684"
                results={[
                  { ...DLC_PRODUCTS[0], weight: '400 g' },
                  { ...DLC_PRODUCTS[0], title: 'Cordon Bleu de Volaille x6', weight: '600 g', ean: '3033710065685' },
                  { ...DLC_PRODUCTS[0], title: 'Cordon Bleu de Volaille x10', weight: '1 kg', ean: '3033710065686' },
                ]}
                onPick={() => {}} onClose={() => {}}
              />)}
            </div>
          </DCArtboard>

          <DCArtboard id="m-fiche-list" label="P2.7 Fiche depuis liste" width={420} height={820}>
            <div style={{ padding: 12, display: 'flex', justifyContent: 'center' }}>
              {mFrame(<FicheMobile product={ficheStandalone} onBack={() => {}} onScan={() => {}}/>)}
            </div>
          </DCArtboard>
        </DCSection>

        {/* ── P2 desktop ────────────────────────────────────── */}
        <DCSection id="p2-desktop" title="P2.8 · Desktop — Édition fiche" subtitle="Inline edit dans le panel droit.">
          <DCArtboard id="d-edit" label="Édition fiche" width={1280} height={800}>
            <div style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--bg)', overflow: 'hidden', borderRadius: 4 }}>
              <CatalogueDesktop
                products={DLC_PRODUCTS}
                selectedId={'3033710065684'}
                onSelect={() => {}}
                editing={true}
                onEdit={() => {}}
                onCloseDetail={() => {}}
                activeNav={'catalogue'}
                onNav={() => {}}
              />
            </div>
          </DCArtboard>
        </DCSection>

        {/* ── P3 ──────────────────────────────────────────────── */}
        <DCSection id="p3" title="P3 · Nice to have" subtitle="Burger menu mobile · Calendrier DLC">
          <DCArtboard id="m-burger" label="P3.9 Burger menu" width={420} height={820}>
            <div style={{ padding: 12, display: 'flex', justifyContent: 'center' }}>
              {mFrame(<BurgerMobile onClose={() => {}} onOpen={() => {}}/>)}
            </div>
          </DCArtboard>

          <DCArtboard id="m-dlc" label="P3.10 Calendrier DLC" width={420} height={820}>
            <div style={{ padding: 12, display: 'flex', justifyContent: 'center' }}>
              {mFrame(<DLCMobile items={DLC_DUE} onBack={() => {}}/>)}
            </div>
          </DCArtboard>
        </DCSection>

      </DesignCanvas>

      <TweaksPanel>
        <TweakSection label="Densité tableau"/>
        <TweakRadio
          label="Densité"
          value={t.density}
          options={['compact', 'standard', 'comfort']}
          onChange={(v) => setTweak('density', v)}
        />
        <TweakSection label="Typographie"/>
        <TweakRadio
          label="Police"
          value={t.font}
          options={['inter', 'geist']}
          onChange={(v) => setTweak('font', v)}
        />
        <TweakSection label="Couleur d'accent"/>
        <TweakRadio
          label="Accent"
          value={t.accent}
          options={['purple', 'navy', 'pink', 'green']}
          onChange={(v) => setTweak('accent', v)}
        />
        <div style={{ fontSize: 10.5, color: 'rgba(41,38,27,0.55)', lineHeight: 1.4, padding: '4px 0' }}>
          Le wireframe v1 utilisait un orange. Le bleu profond est ma proposition par défaut — plus outil, moins marketing. L'encre teste l'option "monochrome strict".
        </div>
      </TweaksPanel>
    </div>
  );
}
