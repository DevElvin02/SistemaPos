// hooks/useBarcodeScanner.ts
import { useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";

export function useBarcodeScanner({ onScan, facingMode = "environment", onError }: {
  onScan: (code: string) => void;
  facingMode?: "user" | "environment";
  onError?: (err: any) => void;
}) {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, []);

  const startScanner = async (elementId: string) => {
    try {
      const html5QrCode = new Html5Qrcode(elementId);
      scannerRef.current = html5QrCode;
      await html5QrCode.start(
        { facingMode },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          onScan(decodedText);
          html5QrCode.stop();
        },
        onError
      );
    } catch (err) {
      onError?.(err);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop();
      await scannerRef.current.clear();
    }
  };

  return { startScanner, stopScanner };
}
