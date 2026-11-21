import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Aplicacao } from './aplicacao/Aplicacao';
import './estilos/global.css';

const elementoRaiz = document.getElementById('raiz');
if (!elementoRaiz) {
  throw new Error("Elemento raiz '#raiz' nao encontrado no documento HTML.");
}

createRoot(elementoRaiz).render(
  <StrictMode>
    <Aplicacao />
  </StrictMode>,
);
