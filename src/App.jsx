import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Catalogue } from './pages/Catalogue';
import { Scanner } from './pages/Scanner';
import { Product } from './pages/Product';
import { NotFound } from './pages/NotFound';

export function App() {
  return (
    <BrowserRouter>
      <div className="dlc-root" style={{ minHeight: '100vh' }}>
        <Routes>
          <Route path="/" element={<Catalogue/>}/>
          <Route path="/scan" element={<Scanner/>}/>
          <Route path="/p/:ean" element={<Product/>}/>
          <Route path="/404" element={<NotFound/>}/>
          <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
