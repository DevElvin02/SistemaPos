import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Order, canCancelOrder, canRefundOrder, canReturnOrder, isInventoryReversalStatus } from '@/lib/data/orders'
import { useAdmin } from '@/context/AdminContext'
import { generateInvoiceHTML, generateReceiptHTML, downloadDocument, generateTicketPDF } from '@/lib/utils/invoice-generator'
import { toast } from 'sonner'
import { useCompanySettings } from '@/hooks/use-company-settings'

interface OrderModalsProps {
  order: Order | null
  isOpen: boolean
  onClose: () => void
  onCancelOrder?: (orderId: string) => void
  onReturnOrder?: (orderId: string) => void
  onRefundOrder?: (orderId: string) => void
}

export function OrderDetailModal({ order, isOpen, onClose, onCancelOrder, onReturnOrder, onRefundOrder }: OrderModalsProps) {
  const { companySettings } = useCompanySettings()
  const { state } = useAdmin()
  const [isInvoiceGenerating, setIsInvoiceGenerating] = useState(false)
  const [isReceiptGenerating, setIsReceiptGenerating] = useState(false)
  const [isPdfGenerating, setIsPdfGenerating] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [orderStatus, setOrderStatus] = useState(order?.status || '')

  useEffect(() => {
    setOrderStatus(order?.status || '')
  }, [order])

  if (!order || !isOpen) return null

  const customer = state.customers.find((c) => c.id === order.customerId)
  const customerName = customer?.name || 'Cliente Desconocido'
  const customerEmail = customer?.email || 'No disponible'

  const handleGenerateInvoice = () => {
    setIsInvoiceGenerating(true)
    try {
      const invoiceHTML = generateInvoiceHTML({
        order,
        customerName,
        customerEmail,
        companyName: companySettings.companyName,
        companyAddress: companySettings.address,
        companyEmail: companySettings.email,
        companyPhone: companySettings.phone,
        companyCountry: companySettings.country,
        invoiceDate: new Date().toLocaleDateString('es-ES'),
      })
      downloadDocument(invoiceHTML, `Factura-${order.id}.html`)
      toast.success('Factura generada y descargada exitosamente')
    } catch (error) {
      toast.error('Error al generar la factura')
      console.error(error)
    } finally {
      setIsInvoiceGenerating(false)
    }
  }

  const handleGenerateReceipt = () => {
    setIsReceiptGenerating(true)
    try {
      const receiptHTML = generateReceiptHTML({
        order,
        customerName,
        customerEmail,
        companyName: companySettings.companyName,
        companyAddress: companySettings.address,
        companyEmail: companySettings.email,
        companyPhone: companySettings.phone,
        companyCountry: companySettings.country,
        invoiceDate: new Date().toLocaleDateString('es-ES'),
      })
      downloadDocument(receiptHTML, `Recibo-${order.id}.html`)
      toast.success('Recibo generado y descargado exitosamente')
    } catch (error) {
      toast.error('Error al generar el recibo')
      console.error(error)
    } finally {
      setIsReceiptGenerating(false)
    }
  }

  const handleGeneratePdf = async () => {
    setIsPdfGenerating(true)
    try {
      await generateTicketPDF({
        order,
        customerName,
        customerEmail,
        companyName: companySettings.companyName,
        companyAddress: companySettings.address,
        companyEmail: companySettings.email,
        companyPhone: companySettings.phone,
        companyCountry: companySettings.country,
        invoiceDate: new Date().toLocaleDateString('es-ES'),
      }, `Ticket-${order.orderNumber}.pdf`)
      toast.success('PDF generado y descargado exitosamente')
    } catch (error) {
      toast.error('Error al generar el PDF')
      console.error(error)
    } finally {
      setIsPdfGenerating(false)
    }
  }

  const handleCancelOrder = () => {
    setOrderStatus('cancelled')
    onCancelOrder?.(order.id)
    toast.success('Venta cancelada exitosamente')
    setShowCancelConfirm(false)
    setTimeout(onClose, 1500)
  }

  const handleReturnOrder = () => {
    setOrderStatus('returned')
    onReturnOrder?.(order.id)
    toast.success('Devolución registrada exitosamente')
    setShowCancelConfirm(false)
    setTimeout(onClose, 1500)
  }

  const handleRefundOrder = () => {
    setOrderStatus('refunded')
    onRefundOrder?.(order.id)
    toast.success('Reembolso registrado exitosamente')
    setShowCancelConfirm(false)
    setTimeout(onClose, 1500)
  }

  const isReversed = isInventoryReversalStatus(orderStatus)
  const canCancel = canCancelOrder(order.status)
  const canReturn = canReturnOrder(order.status)
  const canRefund = canRefundOrder(order.status)
  const shouldShowReversalHint = !isReversed && !canCancel && (canReturn || canRefund)

  return createPortal((
    <>
      <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
        <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto relative z-[71]"
             onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Detalles de la Venta</h2>
                <p className="text-sm opacity-90">Orden #{order.id}</p>
              </div>
              <button
                onClick={onClose}
                className="text-primary-foreground hover:bg-primary/80 p-2 rounded transition"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Status Alert */}
            {isReversed && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 p-4 rounded-lg">
                <p className="font-semibold">Esta venta está en estado {orderStatus}</p>
              </div>
            )}

            {shouldShowReversalHint && (
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 p-4 rounded-lg">
                <p className="font-semibold">Venta entregada</p>
                <p className="text-sm mt-1">Usa devolución o reembolso según corresponda. La cancelación ya no aplica para esta venta.</p>
              </div>
            )}

            {/* Order Information */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">Información de la Venta</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Número de Orden</p>
                    <p className="font-semibold">{order.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha</p>
                    <p className="font-semibold">{new Date(order.date).toLocaleDateString('es-ES')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Estado</p>
                    <p className={`font-semibold inline-block px-3 py-1 rounded-full text-sm ${
                      isReversed
                        ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    }`}>
                      {isReversed ? orderStatus : 'Completada'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">Información del Cliente</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="font-semibold">{customerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm text-muted-foreground">{customerEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Monto Total</p>
                    <p className="font-semibold text-lg">${order.amount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">Acciones</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
                <button
                  onClick={handleGenerateInvoice}
                  disabled={isReversed || isInvoiceGenerating}
                  className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isInvoiceGenerating ? (
                    <>
                      <span className="inline-block animate-spin">⌛</span>
                      Generando...
                    </>
                  ) : (
                    <>
                      <span>📄</span>
                      Generar Factura
                    </>
                  )}
                </button>

                <button
                  onClick={handleGenerateReceipt}
                  disabled={isReversed || isReceiptGenerating}
                  className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isReceiptGenerating ? (
                    <>
                      <span className="inline-block animate-spin">⌛</span>
                      Generando...
                    </>
                  ) : (
                    <>
                      <span>🧾</span>
                      Generar Recibo
                    </>
                  )}
                </button>

                <button
                  onClick={handleGeneratePdf}
                  disabled={isReversed || isPdfGenerating}
                  className="flex items-center justify-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isPdfGenerating ? (
                    <>
                      <span className="inline-block animate-spin">⌛</span>
                      Generando PDF...
                    </>
                  ) : (
                    <>
                      <span>🖨</span>
                      Generar PDF
                    </>
                  )}
                </button>

                {canCancel && (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="flex items-center justify-center gap-2 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg hover:bg-destructive/90 transition col-span-2 sm:col-span-1"
                  >
                    <span>✕</span>
                    Cancelar Venta
                  </button>
                )}

                {canReturn && (
                  <button
                    onClick={handleReturnOrder}
                    className="flex items-center justify-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition col-span-2 sm:col-span-1"
                  >
                    <span>↺</span>
                    Registrar Devolución
                  </button>
                )}

                {canRefund && (
                  <button
                    onClick={handleRefundOrder}
                    className="flex items-center justify-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition col-span-2 sm:col-span-1"
                  >
                    <span>$</span>
                    Registrar Reembolso
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-muted/50 border-t p-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && canCancel && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCancelConfirm(false)}>
          <div className="bg-card rounded-lg shadow-lg max-w-sm w-full mx-4 relative z-[81]"
               onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-bold mb-2">Confirmar Cancelación</h3>
              <p className="text-muted-foreground mb-6">
                ¿Está seguro de que desea cancelar la venta #{order.id}? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition"
                >
                  No, mantener
                </button>
                <button
                  onClick={handleCancelOrder}
                  className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition"
                >
                  Sí, cancelar venta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  ), document.body)
}
