import React, { useState, useEffect } from 'react';
import { DLC_PRODUCTS, DLC_DUE } from './data';
import { CatalogueMobile } from './screens/mobile-catalogue';
import { CameraBG, ScannerInformative } from './screens/mobile-scanner';
import { Sheet, ProductSheetContent, FicheMobile, NotFoundMobile, MultipleResultsMobile, BurgerMobile, DLCMobile } from './screens/mobile-sheet';
import { Icon } from './icons';

export function MobileProto({ initial = 'catalogue', autoScan = false }) {
  const [route, setRoute] = useState(initial);
  const [openProduct, setOpenProduct] = useState(null);
  const [scanCount, setScanCount] = useState(12);
  const [scanState, setScanState] = useState('scanning');

  // Auto-scan demo: after 2s in scanner, "detect" a product
  useEffect(() => {
    if (route === 'scanner' && autoScan) {
      const t = setTimeout(() => {
        setOpenProduct(DLC_PRODUCTS[0]);
        setRoute('detected');
        setScanCount(c => c + 1);
      }, 2200);
      return () => clearTimeout(t);
    }
  }, [route, autoScan]);

  const goCatalogue = () => { setRoute('catalogue'); setOpenProduct(null); };
  const openScanner = () => { setRoute('scanner'); setScanState('scanning'); };
  const openProductFromList = (p) => { setOpenProduct(p); setRoute('fiche'); };

  if (route === 'burger') return <BurgerMobile onClose={goCatalogue} onOpen={(t) => {
    if (t === 'dlc') setRoute('dlc');
    else goCatalogue();
  }}/>;

  if (route === 'dlc') return <DLCMobile items={DLC_DUE} onBack={() => setRoute('burger')}/>;

  if (route === 'catalogue') {
    return <CatalogueMobile
      products={DLC_PRODUCTS}
      onOpenProduct={openProductFromList}
      onScan={openScanner}
      onMenu={() => setRoute('burger')}
      scanCount={scanCount}
    />;
  }

  if (route === 'fiche') {
    return <FicheMobile product={openProduct} onBack={goCatalogue} onScan={openScanner}/>;
  }

  if (route === 'notfound') {
    return <NotFoundMobile ean="3017624999999" onClose={openScanner} onCreate={openScanner}/>;
  }

  if (route === 'multi') {
    const variants = [
      { ...DLC_PRODUCTS[0], weight: '400 g' },
      { ...DLC_PRODUCTS[0], title: 'Cordon Bleu de Volaille x6', weight: '600 g', ean: '3033710065685' },
      { ...DLC_PRODUCTS[0], title: 'Cordon Bleu de Volaille x10', weight: '1 kg', ean: '3033710065686' },
    ];
    return <MultipleResultsMobile ean="3033710065684" results={variants}
      onPick={(p) => { setOpenProduct(p); setRoute('detected'); setScanCount(c => c + 1); }}
      onClose={openScanner}/>;
  }

  if (route === 'scanner') {
    return <ScannerInformative
      onClose={goCatalogue}
      scanCount={scanCount}
      lastScans={DLC_PRODUCTS.slice(0, 4)}
    />;
  }

  if (route === 'detected') {
    return (
      <div style={{ position: 'absolute', inset: 0 }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <CameraBG blur={2}/>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}/>
        </div>
        <button onClick={openScanner} style={{
          position: 'absolute', top: 65, right: 14, zIndex: 40,
          width: 38, height: 38, borderRadius: 99,
          background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon.Close s={18} c="white"/>
        </button>
        <Sheet>
          <ProductSheetContent product={openProduct} fromScan onEdit={() => {}}/>
        </Sheet>
      </div>
    );
  }

  return null;
}
