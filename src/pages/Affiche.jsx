import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory } from '../lib/scanHistory';
import { getRecentScans } from '../lib/scans';
import { getProductByEan, updateProduct, createProduct } from '../lib/products';
import { fetchFromOFF } from '../lib/openFoodFacts';
import { searchPackshots } from '../lib/bingImages';
import { Icon } from '../icons';

function PackshotModal({ packshots, currentUrl, saving, onSelect, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 100, padding: '0 0 env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--canvas)', borderRadius: '16px 16px 0 0',
          padding: '20px 16px 24px', width: '100%', maxWidth: 480,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>Choisir un packshot</span>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-4)', padding: 4 }}>
            <Icon.Close s={18}/>
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {packshots.map((url, i) => (
            <button
              key={i}
              onClick={() => onSelect(url)}
              disabled={saving}
              style={{
                border: url === currentUrl ? '2.5px solid var(--primary)' : '2px solid var(--hairline-strong)',
                borderRadius: 10, overflow: 'hidden', padding: 0, cursor: 'pointer',
                background: 'var(--surface)', aspectRatio: '1', opacity: saving ? 0.6 : 1,
              }}
            >
              <img
                src={url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={e => { e.currentTarget.style.opacity = '0.3'; }}
              />
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          style={{
            marginTop: 16, width: '100%', padding: '11px 0',
            border: '1px solid var(--hairline-strong)', borderRadius: 10,
            background: 'var(--canvas)', cursor: 'pointer', fontSize: 14,
            color: 'var(--ink-3)', fontFamily: 'var(--font-sans)',
          }}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

function AfficheCard({ entry, onImageClick, onCardClick }) {
  const product = entry.product;
  const resolvedImage = product?.image_url || entry.packshots?.[0] || null;
  const title = product?.title || entry.title || entry.ean;
  const brand = product?.brand || entry.brand || null;
  const canPickImage = !!(product || entry.packshots?.length > 0);
  const [copied, setCopied] = useState(false);

  function copyEan(e) {
    e.stopPropagation();
    navigator.clipboard?.writeText(entry.ean);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: 'var(--canvas)', border: '0.5px solid var(--hairline)' }}>
      <button
        onClick={() => onCardClick(entry.ean)}
        style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ aspectRatio: '1', width: '100%', overflow: 'hidden', background: 'var(--surface)' }}>
          {entry.loadingPackshots ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'var(--ink-5)' }}>
              ···
            </div>
          ) : resolvedImage ? (
            <img
              src={resolvedImage} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={e => { e.currentTarget.style.opacity = '0'; }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
              <Icon.Image s={24} c="var(--ink-5)"/>
            </div>
          )}
        </div>
        <div style={{ padding: '8px 10px 4px' }}>
          <div style={{
            fontSize: 12, fontWeight: 500, color: 'var(--ink)',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', lineHeight: 1.35, minHeight: '2.7em',
          }}>{title}</div>
          {brand && (
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{brand}</div>
          )}
        </div>
      </button>
      <button
        onClick={copyEan}
        style={{
          width: '100%', padding: '3px 10px 9px',
          display: 'flex', alignItems: 'center', gap: 4,
          border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {entry.ean}
        </span>
        {copied
          ? <Icon.Check s={10} c="var(--primary)"/>
          : <Icon.Copy s={10} c="var(--ink-5)"/>}
      </button>
      {canPickImage && !entry.loadingPackshots && (
        <button
          onClick={() => onImageClick(entry)}
          style={{
            position: 'absolute', top: 6, right: 6,
            width: 28, height: 28, borderRadius: 7,
            background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(4px)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon.Image s={13} c="white"/>
        </button>
      )}
    </div>
  );
}

export function Affiche() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      // Try Supabase scans table first, fall back to localStorage
      let rawList;
      const supaScans = await getRecentScans(20);
      if (supaScans !== null && supaScans.length > 0) {
        rawList = supaScans;
      } else {
        const seen = new Set();
        rawList = getHistory().filter(h => {
          if (seen.has(h.ean)) return false;
          seen.add(h.ean);
          return true;
        });
      }

      // Use localStorage cache for title/brand while Supabase loads
      const localMap = Object.fromEntries(getHistory().map(h => [h.ean, h]));
      const initial = rawList.map(h => ({
        ean: h.ean,
        title: localMap[h.ean]?.title || null,
        brand: localMap[h.ean]?.brand || null,
        category: localMap[h.ean]?.category || null,
        product: null,
        packshots: [],
        loadingPackshots: false,
      }));
      setItems(initial);

      initial.forEach(async (entry, idx) => {
        let product = null;
        try { product = await getProductByEan(entry.ean); } catch {}
        if (!product) {
          try { product = await fetchFromOFF(entry.ean); } catch {}
        }

        const needsFetch = !product?.image_url;
        setItems(prev => prev.map((it, i) =>
          i === idx ? { ...it, product, loadingPackshots: needsFetch && !!(product?.title || entry.title) } : it
        ));

        if (needsFetch) {
          const titleForSearch = product?.title || entry.title;
          const brandForSearch = product?.brand || entry.brand;
          if (titleForSearch) {
            const packshots = await searchPackshots(titleForSearch, brandForSearch, 3, entry.ean).catch(() => []);
            setItems(prev => prev.map((it, i) =>
              i === idx ? { ...it, packshots, loadingPackshots: false } : it
            ));
          } else {
            setItems(prev => prev.map((it, i) =>
              i === idx ? { ...it, loadingPackshots: false } : it
            ));
          }
        }
      });
    }
    load();
  }, []);

  async function handleImageClick(entry) {
    if (entry.packshots.length > 0) {
      setModal(entry);
      return;
    }
    const product = entry.product;
    if (!product) return;

    const updatingEntry = { ...entry, loadingPackshots: true };
    setItems(prev => prev.map(it => it.ean === entry.ean ? updatingEntry : it));

    const packshots = await searchPackshots(product.title, product.brand, 3, entry.ean).catch(() => []);
    const ready = { ...updatingEntry, packshots, loadingPackshots: false };
    setItems(prev => prev.map(it => it.ean === entry.ean ? ready : it));
    if (packshots.length > 0) setModal(ready);
  }

  async function handleSelectImage(url) {
    if (!modal?.product) return;
    setSaving(true);
    try {
      const p = modal.product;
      // If product comes from OFF (not yet in Supabase), create it; otherwise update
      if (p.source === 'openfoodfacts') {
        await createProduct({ ...p, image_url: url });
      } else {
        await updateProduct(p.ean, { image_url: url });
      }
      const updatedProduct = { ...p, image_url: url, source: undefined };
      setItems(prev => prev.map(it =>
        it.ean === modal.ean ? { ...it, product: updatedProduct } : it
      ));
      setModal(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--canvas)',
        borderBottom: '0.5px solid var(--line)',
        padding: '12px 16px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Affiche</h1>
          <span style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
            {items.length} produit{items.length !== 1 ? 's' : ''}
          </span>
        </div>

      </header>

      <main style={{ flex: 1, paddingBottom: 80 }}>
        {items.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 14, lineHeight: 1.6 }}>
            Aucun scan enregistré.
            <br/>
            <button
              onClick={() => nav('/scan')}
              style={{
                marginTop: 16, background: 'var(--primary)', color: '#fff',
                border: 'none', borderRadius: 10, padding: '10px 24px',
                cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-sans)',
              }}
            >
              Scanner un produit
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, padding: '12px' }}>
            {items.map(entry => (
              <AfficheCard
                key={entry.ean}
                entry={entry}
                onImageClick={handleImageClick}
                onCardClick={(ean) => nav(`/p/${ean}`)}
              />
            ))}
          </div>
        )}
      </main>


      {modal && (
        <PackshotModal
          packshots={modal.packshots}
          currentUrl={modal.product?.image_url}
          saving={saving}
          onSelect={handleSelectImage}
          onClose={() => !saving && setModal(null)}
        />
      )}
    </div>
  );
}
