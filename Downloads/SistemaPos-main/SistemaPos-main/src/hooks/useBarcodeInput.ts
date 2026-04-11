import { useRef } from 'react';

export function useBarcodeInput(onScan: (code: string) => void) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputRef.current) {
      const value = inputRef.current.value.trim();
      if (value) {
        onScan(value);
        inputRef.current.value = '';
      }
    }
  };

  return { inputRef, handleKeyDown };
}
