/**
 * Minimal hand-off channel between the barcode scanner screen and the
 * add/edit form underneath it. The form stays mounted while the scanner is
 * pushed on top, so a module-level callback preserves form state without
 * threading params through the router.
 */

type ScanHandler = (barcode: string) => void;

let handler: ScanHandler | null = null;

export const scanBus = {
  subscribe(h: ScanHandler) {
    handler = h;
  },
  unsubscribe() {
    handler = null;
  },
  emit(barcode: string) {
    handler?.(barcode);
  },
};
