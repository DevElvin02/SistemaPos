import { Camera } from 'lucide-react';

export function ScanButton({ onClick, className = '', ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 h-[42px] rounded-xl bg-[#F28705] text-white hover:bg-[#F26716] transition shrink-0 ${className}`}
      {...props}
    >
      <Camera size={20} />
      Escanear <span aria-hidden>📷</span>
    </button>
  );
}
