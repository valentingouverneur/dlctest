// DLC v2 — interactive prototype wrappers
// One MobileProto component holds nav state and routes between screens.
// Useful for the "main" interactive artboard. Standalone-screen artboards
// just use the static screens directly.

const { useState: pUseState, useEffect: pUseEffect } = React;

function MobileProto({ initial = 'catalogue', autoScan = false }) {
  // states: catalogue, scanner, detected (sheet over scanner), fiche, notfound, multi, burger, dlc
  const [route, setRoute] = pUseState(initial);
  const [openProduct, setOpenProduct] = pUseState(null);
  const [scanCount, setScanCount] = pUseState(12);
  const [scanState, setScanState] = pUseState('scanning'); // 'scanning' | 'detected'

  // Auto-scan demo: when entering scanner, after 2s, "detect" a product
  pUseEffect(() => {
    if (route === 'scanner' && autoScan) {
      const t = setTimeout(() => {
        setOpenProduct(window.DLC_PRODUCTS[0]);
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
    else if (t === 'catalogue') goCatalogue();
    else goCatalogue();
  }}/>;
  if (route === 'dlc') return <DLCMobile items={window.DLC_DUE} onBack={() => setRoute('burger')}/>;

  if (route === 'catalogue') {
    return <CatalogueMobile
      products={window.DLC_PRODUCTS}
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
      { ...window.DLC_PRODUCTS[0], weight: '400 g' },
      { ...window.DLC_PRODUCTS[0], title: 'Cordon Bleu de Volaille x6', weight: '600 g', ean: '3033710065685' },
      { ...window.DLC_PRODUCTS[0], title: 'Cordon Bleu de Volaille x10', weight: '1 kg', ean: '3033710065686' },
    ];
    return <MultipleResultsMobile ean="3033710065684" results={variants}
      onPick={(p) => { setOpenProduct(p); setRoute('detected'); setScanCount(c => c + 1); }}
      onClose={openScanner}/>;
  }

  if (route === 'scanner') {
    return <ScannerSobre onClose={goCatalogue} scanCount={scanCount} state={scanState}/>;
  }

  if (route === 'detected') {
    // Camera bg behind, sheet over with detected badge
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

window.MobileProto = MobileProto;
