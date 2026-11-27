import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

configure({ asyncUtilTimeout: 4000 });

if (typeof globalThis.ResizeObserver === 'undefined') {
  class ObservadorRedimensionamento {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ObservadorRedimensionamento;
}

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = () => null;
}

if (typeof globalThis.DOMMatrixReadOnly === 'undefined') {
  class MatrizLeituraPolyfill {
    readonly m11: number = 1;
    readonly m12: number = 0;
    readonly m21: number = 0;
    readonly m22: number = 1;
    readonly m41: number = 0;
    readonly m42: number = 0;

    constructor(init?: string | number[]) {
      if (Array.isArray(init)) {
        if (init.length >= 6) {
          this.m11 = init[0] ?? 1;
          this.m12 = init[1] ?? 0;
          this.m21 = init[2] ?? 0;
          this.m22 = init[3] ?? 1;
          this.m41 = init[4] ?? 0;
          this.m42 = init[5] ?? 0;
        }
        return;
      }

      if (typeof init === 'string') {
        const matchMatrix = /matrix\(([^)]+)\)/.exec(init);
        if (matchMatrix?.[1]) {
          const numeros = matchMatrix[1].split(',').map((item) => Number.parseFloat(item.trim()));
          if (numeros.length >= 6 && numeros.every((n) => Number.isFinite(n))) {
            this.m11 = numeros[0] ?? 1;
            this.m12 = numeros[1] ?? 0;
            this.m21 = numeros[2] ?? 0;
            this.m22 = numeros[3] ?? 1;
            this.m41 = numeros[4] ?? 0;
            this.m42 = numeros[5] ?? 0;
          }
          return;
        }

        const matchTranslate = /translate(?:3d)?\(([^)]+)\)/.exec(init);
        if (matchTranslate?.[1]) {
          const numeros = matchTranslate[1]
            .split(',')
            .map((item) => Number.parseFloat(item.trim()));
          if (Number.isFinite(numeros[0])) {
            this.m41 = numeros[0] ?? 0;
          }
          if (Number.isFinite(numeros[1])) {
            this.m42 = numeros[1] ?? 0;
          }
        }
      }
    }
  }

  Object.defineProperty(globalThis, 'DOMMatrixReadOnly', {
    value: MatrizLeituraPolyfill,
    configurable: true,
    writable: true,
  });
}
