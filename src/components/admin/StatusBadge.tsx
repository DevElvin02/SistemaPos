interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

const statusLabelMap: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  delivered: 'Entregada',
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
  default: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  info: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
};

const statusVariantMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  active: 'success',
  inactive: 'default',
  delivered: 'success',
  shipped: 'info',
  processing: 'warning',
  pending: 'warning',
  cancelled: 'error',
  returned: 'info',
  refunded: 'error',
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
