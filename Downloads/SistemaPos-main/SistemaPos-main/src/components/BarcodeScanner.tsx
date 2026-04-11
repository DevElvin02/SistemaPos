import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export function BarcodeScanner({ open, onClose, onScan }) {
  const scannerRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [timeoutId, setTimeoutId] = useState(null);

  useEffect(() => {
    if (!open) return;
    let html5QrCode;
    setError('');
    setLoading(true);

    (async () => {
      try {
        html5QrCode = new Html5Qrcode('barcode-scanner');
        scannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 15, qrbox: 280, aspectRatio: 1 },
          (decodedText) => {
            onScan(decodedText);
            html5QrCode.stop();
            onClose();
            new window.Audio('https://cdn.pixabay.com/audio/2022/07/26/audio_124bfae1b2.mp3').play();
          },
          (err) => {}
        );
        setLoading(false);

        // Si no detecta nada en 15 segundos, muestra error
        const id = setTimeout(() => {
          setError('No se detectó ningún código. Intenta acercar el código a la cámara.');
          if (html5QrCode) {
            try { html5QrCode.stop(); } catch {}
          }
        }, 15000);
        setTimeoutId(id);

      } catch (err) {
        setError('No se pudo acceder a la cámara. Permiso denegado o no disponible.');
        setLoading(false);
      }
    })();

    return () => {
      if (html5QrCode) {
        try { html5QrCode.stop(); } catch {}
        try { html5QrCode.clear(); } catch {}
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [open, onClose, onScan]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl p-6 shadow-xl flex flex-col items-center gap-4 min-w-[320px]">
        <div id="barcode-scanner" className="w-[320px] h-[320px] bg-black rounded-xl" />
        {loading && <div className="text-gray-500">Cargando cámara...</div>}
        {error && <div className="text-red-600">{error}</div>}
        <button onClick={onClose} className="mt-2 px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300">Cancelar</button>
      </div>
    </div>
  );
}
