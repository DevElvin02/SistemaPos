// components/BarcodeScannerModal.tsx
import React, { useEffect } from "react";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";

interface Props {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  facingMode?: "user" | "environment";
}

export const BarcodeScannerModal: React.FC<Props> = ({ open, onClose, onScan, facingMode = "environment" }) => {
  const { startScanner, stopScanner } = useBarcodeScanner({
    onScan: (code) => {
      onScan(code);
      onClose();
    },
    facingMode,
    onError: (err) => alert("Error al acceder a la cámara: " + err)
  });

  useEffect(() => {
    if (open) {
      startScanner("barcode-scanner");
    } else {
      stopScanner();
    }
    return () => { stopScanner(); };
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal">
      <div id="barcode-scanner" style={{ width: 300, height: 300 }} />
      <button onClick={onClose}>Cerrar</button>
    </div>
  );
};
