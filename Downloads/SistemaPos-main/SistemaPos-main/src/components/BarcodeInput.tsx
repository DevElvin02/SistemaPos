// components/BarcodeInput.tsx
import React, { useState } from "react";
import { isElectron, isMobileBrowser, isWeb } from "../utils/environment";
import { canUseCameraScanner, UserRole } from "../utils/permissions";
import { BarcodeScannerModal } from "./BarcodeScannerModal";
import { useManualScannerInput } from "../hooks/useManualScannerInput";

interface Props {
  userRole: UserRole;
  onBarcode: (code: string) => void;
}

export const BarcodeInput: React.FC<Props> = ({ userRole, onBarcode }) => {
  const [scannerOpen, setScannerOpen] = useState(false);
  const env = { isWeb: isWeb(), isMobile: isMobileBrowser(), isElectron: isElectron() };
  const canScan = canUseCameraScanner(userRole, env);
  const { inputRef, handleKeyDown } = useManualScannerInput({ onScan: onBarcode });

  const handleOpenScanner = () => {
    if (!canScan) {
      alert("No tienes permisos para usar el escáner de cámara.");
      return;
    }
    setScannerOpen(true);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        placeholder="Escanea o escribe el código"
        onKeyDown={handleKeyDown}
        autoFocus={env.isElectron}
      />
      {canScan && (
        <button onClick={handleOpenScanner}>
          Escanear código
        </button>
      )}
      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={onBarcode}
        facingMode={env.isMobile ? "environment" : "user"}
      />
    </div>
  );
};
