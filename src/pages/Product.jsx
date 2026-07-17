import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getProductByEan, createProduct, updateProduct } from '../lib/products';
import { fetchFromOFF } from '../lib/openFoodFacts';
import { searchPackshot } from '../lib/bingImages';
import { addScan } from '../lib/scanHistory';
import { Packshot, CopyField, ImageModal } from '../primitives';
import { Icon } from '../icons';

function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch {}
  document.body.removeChild(ta);
  return Promise.resolve();
}

// ─── "Add to catalogue" banner (for OFF results) ───────────────────
function OFFBanner({ product, imageUrl, onSaved, onDismiss }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      await createProduct({ ...product, image_url: imageUrl || null });
      setSaved(true);
      onSaved?.();
    } catch (e) {
      setErr(e.message || 'Erreur lors de l\'ajout');
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div style={{ margin: '0 16px 4px', padding: '10px 14px', borderRadius: 8, background: 'var(--tint-mint)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--success)', fontWeight: 500 }}>
        <Icon.Check s={15} c="var(--success)" w={2}/>
        Ajouté au catalogue
      </div>
    );
  }

  return (
    <div style={{ margin: '0 16px 4px', padding: '10px 14px', borderRadius: 8, background: 'var(--tint-sky)', border: '0.5px solid rgba(0,117,222,0.15)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <div style={{ width: 16, height: 16, borderRadius: 99, background: 'var(--link-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'white', lineHeight: 1 }}>i</span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--link-blue)' }}>
          Trouvé sur Open Food Facts · absent du catalogue
        </div>
      </div>
      {err && <div style={{ fontSize: 12, color: 'var(--err)', marginBottom: 8 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ flex: 1, height: 34, justifyContent: 'center', fontSize: 13 }}>
          {saving ? 'Ajout…' : <><Icon.Plus s={13} c="white"/> Ajouter au catalogue</>}
        </button>
        <button onClick={onDismiss} className="btn" style={{ height: 34, width: 34, padding: 0, justifyContent: 'center' }}>
          <Icon.Close s={13}/>
        </button>
      </div>
    </div>
  );
}

// ─── Bing image suggestion banner ──────────────────────────────────
function BingImageBanner({ imageUrl, onAccept, onDismiss }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleAccept = async () => {
    setSaving(true);
    await onAccept(imageUrl);
    setSaved(true);
    setSaving(false);
  };

  if (saved) return null;

  return (
    <div style={{ margin: '0 16px 4px', padding: '10px 14px', borderRadius: 8, background: 'var(--tint-cream)', border: '0.5px solid var(--hairline-strong)' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {/* Bing image preview */}
        <img
          src={imageUrl}
          alt=""
          loading="lazy" decoding="async"
          style={{ width: 52, height: 52, borderRadius: 6, objectFit: 'contain', background: 'white', border: '0.5px solid var(--hairline)', flexShrink: 0 }}
          onError={e => { e.target.style.display = 'none'; }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>
            Packshot trouvé · Enregistrer ?
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleAccept} disabled={saving} className="btn btn-primary" style={{ height: 28, fontSize: 12, padding: '0 10px' }}>
              {saving ? '…' : <><Icon.Check s={12} c="white"/> Oui</>}
            </button>
            <button onClick={onDismiss} className="btn" style={{ height: 28, fontSize: 12, padding: '0 10px' }}>
              Ignorer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Not found screen ───────────────────────────────────────────────
function NotFoundScreen({ ean, onBack, onScan }) {
  return (
    <div className="app-shell">
      <Header onBack={onBack}/>
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 99, background: 'var(--tint-rose)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Icon.Warn s={28} c="var(--err)"/>
        </div>
        <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>EAN introuvable</div>
        <div className="mono" style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 6, letterSpacing: '0.04em' }}>{ean}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 16, lineHeight: 1.5 }}>
          Absent du catalogue et d'Open Food Facts.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24 }}>
          <button onClick={onScan} className="btn">Re-scanner</button>
          <button onClick={onBack} className="btn btn-primary">Retour catalogue</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────
export function Product() {
  const { ean } = useParams();
  const [searchParams] = useSearchParams();
  const fromScan = searchParams.get('from') === 'scan';
  const nav = useNavigate();

  const [product, setProduct] = useState(null);       // from Supabase
  const [offProduct, setOffProduct] = useState(null); // from OFF
  const [offDismissed, setOffDismissed] = useState(false);

  const [bingImageUrl, setBingImageUrl] = useState(null);
  const [bingDismissed, setBingDismissed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [offLoading, setOffLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // 1. Supabase lookup
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setProduct(null);
    setOffProduct(null);
    setOffDismissed(false);
    setBingImageUrl(null);
    setBingDismissed(false);

    getProductByEan(ean)
      .then(p => {
        if (cancelled) return;
        if (p) {
          setProduct(p);
          if (fromScan) addScan(p);
        } else {
          // 2. Not in Supabase — try OFF for metadata
          setOffLoading(true);
          fetchFromOFF(ean)
            .then(offP => {
              if (cancelled) return;
              setOffProduct(offP);
              if (offP && fromScan) addScan({ ...offP });
            })
            .catch(() => {})
            .finally(() => { if (!cancelled) setOffLoading(false); });
        }
      })
      .catch(e => { if (!cancelled) setErr(e.message || 'Erreur'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [ean]);

  // 2. Bing image search — when product has no image_url, or the only
  // image we have came from OFF (those photos are often low quality, so
  // still search for a better one and let the suggestion banner offer it)
  useEffect(() => {
    const p = product || offProduct;
    if (!p || bingImageUrl || bingDismissed) return;
    if (p.image_url && p.source !== 'openfoodfacts') return;

    let cancelled = false;
    searchPackshot(p.title, p.brand, p.ean)
      .then(url => { if (!cancelled && url) setBingImageUrl(url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [product, offProduct]);

  const handleCopyAll = async (p) => {
    const parts = [p.title, p.brand, p.weight, p.ean].filter(Boolean);
    await copyToClipboard(parts.join('\t'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1600);
  };

  const handleCopyField = async (_, value) => { if (value) await copyToClipboard(value); };

  // Accept Bing image — save to Supabase
  const acceptBingImage = async (url) => {
    setBingImageUrl(url);
    setBingDismissed(true); // hide banner
    const p = product || offProduct;
    if (!p) return;
    try {
      if (product) {
        const updated = await updateProduct(product.ean, { image_url: url });
        setProduct(updated);
      }
      // For OFF products, will be saved when "Ajouter au catalogue" is clicked
    } catch {}
  };

  // Loading states
  if (loading) {
    return (
      <div className="app-shell">
        <Header onBack={() => nav(-1)}/>
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)' }}>Chargement…</div>
      </div>
    );
  }
  if (err) {
    return (
      <div className="app-shell">
        <Header onBack={() => nav(-1)}/>
        <div style={{ padding: 24, color: 'var(--err)' }}>{err}</div>
      </div>
    );
  }

  // No Supabase product
  if (!product) {
    if (offLoading) {
      return (
        <div className="app-shell">
          <Header onBack={() => nav(-1)}/>
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
            <Icon.Spinner s={20} c="var(--ink-4)"/>
            <div style={{ marginTop: 10 }}>Recherche sur Open Food Facts…</div>
          </div>
        </div>
      );
    }
    if (!offProduct) {
      return <NotFoundScreen ean={ean} onBack={() => nav('/')} onScan={() => nav('/scan')}/>;
    }
    // Show OFF product
    return (
      <ProductSheet
        product={offProduct}
        resolvedImageUrl={bingImageUrl || offProduct.image_url}
        fromOFF={!offDismissed}
        bingImageUrl={!bingDismissed && bingImageUrl ? bingImageUrl : null}
        copiedAll={copiedAll}
        onCopyAll={() => handleCopyAll(offProduct)}
        onCopyField={handleCopyField}
        onBack={() => nav(-1)}
        onScan={() => nav('/scan')}
        onOFFSaved={() => getProductByEan(ean).then(p => { if (p) setProduct(p); })}
        onOFFDismiss={() => setOffDismissed(true)}
        onBingAccept={acceptBingImage}
        onBingDismiss={() => setBingDismissed(true)}
        offProductForSave={{ ...offProduct, image_url: bingImageUrl || null }}
      />
    );
  }

  // Supabase product
  return (
    <ProductSheet
      product={product}
      resolvedImageUrl={bingImageUrl || product.image_url}
      bingImageUrl={!bingDismissed && bingImageUrl && !product.image_url ? bingImageUrl : null}
      copiedAll={copiedAll}
      onCopyAll={() => handleCopyAll(product)}
      onCopyField={handleCopyField}
      onBack={() => nav(-1)}
      onScan={() => nav('/scan')}
      onBingAccept={acceptBingImage}
      onBingDismiss={() => setBingDismissed(true)}
    />
  );
}

// ─── Shared product sheet ───────────────────────────────────────────
function ProductSheet({
  product, resolvedImageUrl,
  fromOFF = false, offProductForSave,
  bingImageUrl,
  copiedAll,
  onCopyAll, onCopyField,
  onBack, onScan,
  onOFFSaved, onOFFDismiss,
  onBingAccept, onBingDismiss,
}) {
  const [modalSrc, setModalSrc] = useState(null);
  const catLabel = product.category === 'Glaces' ? 'Surgelés' : product.category;

  return (
    <div className="app-shell">
      {modalSrc && <ImageModal src={modalSrc} onClose={() => setModalSrc(null)}/>}
      <Header onBack={onBack} onScan={onScan}/>

      {/* Packshot + title */}
      <div style={{ padding: '20px 16px 16px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div
          onClick={() => resolvedImageUrl && setModalSrc(resolvedImageUrl)}
          style={{ cursor: resolvedImageUrl ? 'zoom-in' : 'default', flexShrink: 0 }}
        >
          <Packshot
            product={{ title: product.title, brand: product.brand, cat: catLabel, imageUrl: resolvedImageUrl }}
            size={88} radius={10} hint={false}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>{product.title}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>{product.brand}</div>
          {product.category && (
            <div style={{ marginTop: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px', borderRadius: 6, background: 'var(--tint-sky)', color: 'var(--ink-2)', fontSize: 12, fontWeight: 600 }}>
                {product.category}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bing image suggestion */}
      {bingImageUrl && (
        <BingImageBanner
          imageUrl={bingImageUrl}
          onAccept={onBingAccept}
          onDismiss={onBingDismiss}
        />
      )}

      {/* OFF banner */}
      {fromOFF && (
        <OFFBanner
          product={offProductForSave || product}
          imageUrl={resolvedImageUrl}
          onSaved={onOFFSaved}
          onDismiss={onOFFDismiss}
        />
      )}

      {/* Copy all */}
      <div style={{ padding: '8px 16px 4px' }}>
        <button onClick={onCopyAll} className="focus-ring" style={{
          width: '100%', height: 44,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: copiedAll ? 'var(--ink)' : 'var(--primary)',
          color: 'white', border: 'none', borderRadius: 8,
          fontFamily: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer',
          transition: 'background-color .15s',
        }}>
          {copiedAll ? <><Icon.Check s={16} c="white"/> Copié</> : <><Icon.Copy s={16} c="white"/> Copier tout (Factory)</>}
        </button>
        <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 6, textAlign: 'center' }}>
          Titre · Marque · Poids · EAN — séparés par tabulation
        </div>
      </div>

      {/* Copy fields */}
      <div style={{ padding: '12px 16px 32px' }}>
        <CopyField label="Titre" value={product.title} large onCopy={onCopyField}/>
        <CopyField label="Marque" value={product.brand} onCopy={onCopyField}/>
        <CopyField label="Poids" value={product.weight} onCopy={onCopyField}/>
        <CopyField label="EAN" value={product.ean} mono onCopy={onCopyField}/>
      </div>
    </div>
  );
}

function Header({ onBack, onScan }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 10,
      background: 'var(--canvas)', borderBottom: '0.5px solid var(--line)',
      padding: '10px 8px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <button onClick={onBack} aria-label="Retour" className="focus-ring" style={{ width: 40, height: 40, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ display: 'flex', transform: 'rotate(180deg)' }}>
          <Icon.ChevronRight s={18} c="var(--ink-2)"/>
        </span>
      </button>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)' }}>Fiche produit</div>
      {onScan ? (
        <button onClick={onScan} aria-label="Scanner" className="focus-ring" style={{ width: 40, height: 40, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon.Scan s={18} c="var(--ink-2)"/>
        </button>
      ) : <div style={{ width: 40 }}/>}
    </header>
  );
}
