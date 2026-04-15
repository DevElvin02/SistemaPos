import { Order } from '@/lib/data/orders'

interface OrderActionButtonsProps {
  order: Order
  onView: (order: Order) => void
  onEmail?: (order: Order) => void
  onInvoice: (order: Order) => void
  onPrint: (order: Order) => void
  onPdf: (order: Order) => void
  onCancel?: (orderId: string) => void
  onReturn?: (orderId: string) => void
  onRefund?: (orderId: string) => void
  disabled?: boolean
}

export function OrderActionButtons({
  order,
  onView,
  onEmail,
  disabled = false,
}: OrderActionButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onEmail?.(order)}
        disabled={disabled || !onEmail}
        className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
        title="Enviar factura por correo"
      >
        Correo
      </button>
      <button
        onClick={() => onView(order)}
        disabled={disabled}
        className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
        title="Ver detalles"
      >
        Ver
      </button>
    </div>
  )
}
