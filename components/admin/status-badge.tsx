interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

const variantStyles = {
  default: 'bg-slate-100 text-slate-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
};

const statusVariantMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  active: 'success',
  inactive: 'default',
  delivered: 'success',
  shipped: 'info',
  processing: 'warning',
  pending: 'warning',
  cancelled: 'error',
  normal: 'success',
  low: 'warning',
  critical: 'error',
  overstock: 'info',
  discontinued: 'error',
  suspended: 'error',
};

export default function StatusBadge({
  status,
  variant: customVariant,
}: StatusBadgeProps) {
  const variant =
    customVariant || (statusVariantMap[status] ?? 'default');

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
