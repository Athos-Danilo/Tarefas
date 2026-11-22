import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Aplicacao } from './aplicacao/Aplicacao';
import './estilos/global.css';
import { registrarServiceWorker } from './pwa/registro-sw';

const elementoRaiz = document.getElementById('raiz');
if (!elementoRaiz) {
  throw new Error("Elemento raiz '#raiz' nao encontrado no documento HTML.");
}

if (import.meta.env.PROD) {
  void registrarServiceWorker();
}

createRoot(elementoRaiz).render(
  <StrictMode>
    <Aplicacao />
  </StrictMode>,
);
