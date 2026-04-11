// components/BarcodeScannerModal.tsx
import React, { useEffect, useRef, useState } from "react";
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
    onError: (err) => {
      // Solo mostrar error si es crítico (no por cada intento fallido de lectura)
      if (err && err.name === 'NotAllowedError') {
        toast.error('Permiso de cámara denegado.');
      } else if (err && err.message && !/No MultiFormat Readers/.test(err.message)) {
        toast.error('Error al acceder a la cámara: ' + err.message);
      }
      // No mostrar error por NotFoundException o fallos normales de escaneo
    }
  });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const scannerRef = useRef(null);

    useEffect(() => {
      if (!open) return;
      let html5QrCode;
      setError("");
      setLoading(true);

      (async () => {
        try {
          html5QrCode = new Html5Qrcode("barcode-scanner-preview");
          scannerRef.current = html5QrCode;
          await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 15, qrbox: { width: 260, height: 180 } },
            (decodedText) => {
              onScan(decodedText);
              html5QrCode.stop();
              onClose();
              toast.success("¡Código escaneado!");
            },
            () => {}
          );
          setLoading(false);
        } catch (err) {
          setError("No se pudo acceder a la cámara. Permiso denegado o no disponible.");
          setLoading(false);
        }
      })();

      return () => {
        html5QrCode?.stop().catch(() => {});
        html5QrCode?.clear().catch(() => {});
      };
    }, [open, onClose]);

    if (!open) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-white rounded-2xl shadow-2xl p-0 w-full max-w-md mx-4">
          <div className="flex flex-col items-center p-6">
            <h2 className="text-xl font-bold text-[#F28705] mb-1">Escanear código</h2>
            <p className="text-sm text-gray-500 mb-4">Coloca el código de barras o QR dentro del marco</p>
            <div className="relative flex items-center justify-center w-[280px] h-[200px] mb-4">
              <div
                id="barcode-scanner-preview"
                className="absolute inset-0 rounded-xl bg-black"
                style={{ width: 280, height: 200 }}
              />
              {/* Marco visual de escaneo */}
              <div className="absolute inset-0 border-4 border-[#F28705] rounded-xl pointer-events-none" />
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
                  <span className="text-white">Iniciando cámara...</span>
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
                  <span className="text-red-400">{error}</span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2 rounded-xl bg-[#F28705] text-white hover:bg-[#F26716] transition font-semibold"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }
