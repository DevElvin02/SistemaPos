import { toast } from 'sonner';
import React, { useState } from 'react';
import { canUseCameraScanner, UserRole } from '../utils/permissions';
import { isWeb, isElectron } from '../utils/environment';
import { ScanButton } from './ScanButton';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { useBarcodeInput } from '../hooks/useBarcodeInput';

interface Props {
  userRole: UserRole;
  onBarcode: (code: string) => void;
  placeholder?: string;
}

export function BarcodeField({ userRole, onBarcode, placeholder = 'Código de barras' }: Props) {

  // Debug: Mostrar valores de rol y entorno
  console.log('userRole:', userRole, 'isWeb:', isWeb());

  const [scannerOpen, setScannerOpen] = useState(false);
  const { inputRef, handleKeyDown } = useBarcodeInput(onBarcode);

  // Lógica de permisos
  const showCameraButton = isWeb() && canUseCameraScanner(userRole);

  const handleScanButton = () => {
    if (!isWeb()) {
      toast.error('El escáner de cámara no está disponible en la versión de escritorio.');
      return;
    }
    if (!showCameraButton) {
      toast.error('No tienes permisos para usar el escáner de cámara.');
      return;
    }
    setScannerOpen(true);
  };

  return (
    <div className="flex gap-2 items-center">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        onKeyDown={handleKeyDown}
        className="flex-1 min-w-0 px-3 py-2.5 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {showCameraButton && isWeb() && (
        <>
          <ScanButton onClick={handleScanButton} />
          <BarcodeScannerModal
            open={scannerOpen}
            onClose={() => setScannerOpen(false)}
            onScan={onBarcode}
          />
        </>
      )}
    </div>
  );
}
