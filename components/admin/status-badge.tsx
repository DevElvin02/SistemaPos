interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

const statusLabelMap: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  delivered: 'Entregada',
  entregado: 'Entregada',
  shipped: 'Enviado',
  processing: 'Procesando',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
  returned: 'Devuelta',
  refunded: 'Reembolsada',
  normal: 'Normal',
  low: 'Bajo',
  critical: 'Crítico',
  overstock: 'Sobrestock',
  discontinued: 'Descontinuado',
  suspended: 'Suspendido',
};

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
  entregado: 'success',
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
  const normalizedStatus = String(status ?? '').trim().toLowerCase();
  const variant =
    customVariant || (statusVariantMap[normalizedStatus] ?? 'default');
  const label = statusLabelMap[normalizedStatus] ?? (status.charAt(0).toUpperCase() + status.slice(1));

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]}`}
    >
      {label}
    </span>
  );
}
