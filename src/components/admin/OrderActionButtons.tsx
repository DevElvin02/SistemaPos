import { Order, canCancelOrder, canRefundOrder, canReturnOrder, isInventoryReversalStatus } from '@/lib/data/orders'

interface OrderActionButtonsProps {
  order: Order
  onView: (order: Order) => void
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
  onInvoice,
  onPrint,
  onPdf,
  onCancel,
  onReturn,
  onRefund,
  disabled = false,
}: OrderActionButtonsProps) {
  const isReversed = isInventoryReversalStatus(order.status)
  const canCancel = canCancelOrder(order.status)
  const canReturn = canReturnOrder(order.status)
  const canRefund = canRefundOrder(order.status)

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onView(order)}
        disabled={disabled}
        className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
        title="Ver detalles"
      >
        Ver
      </button>

      <div className="relative group">
        <button
          className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition"
          title="Más acciones"
          disabled={disabled}
        >
          ⋮
        </button>
        <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
          <button
            onClick={() => onInvoice(order)}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-muted rounded-t-lg transition first:rounded-t-lg"
            title="Generar comprobante"
          >
            📄 Factura
          </button>
          <button
            onClick={() => onPrint(order)}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-muted transition"
            title="Imprimir ticket"
          >
            🧾 Recibo
          </button>
          <button
            onClick={() => onPdf(order)}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-muted transition"
            title="Descargar PDF"
          >
            🖨 PDF
          </button>
          {canCancel && (
            <button
              onClick={() => onCancel?.(order.id)}
              className="block w-full text-left px-4 py-2 text-sm text-destructive hover:bg-red-50 dark:hover:bg-red-950 rounded-b-lg transition"
              title="Cancelar venta"
            >
              ✕ Cancelar
            </button>
          )}
          {canReturn && (
            <button
              onClick={() => onReturn?.(order.id)}
              className="block w-full text-left px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950 transition"
              title="Registrar devolución"
            >
              ↺ Devolver
            </button>
          )}
          {canRefund && (
            <button
              onClick={() => onRefund?.(order.id)}
              className="block w-full text-left px-4 py-2 text-sm text-destructive hover:bg-red-50 dark:hover:bg-red-950 rounded-b-lg transition"
              title="Registrar reembolso"
            >
              $ Reembolsar
            </button>
          )}
          {isReversed && (
            <div className="px-4 py-2 text-xs text-muted-foreground rounded-b-lg">
              Venta {order.status}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
