import { useState } from 'react'
import { Order } from '@/lib/data/orders'
import { useAdmin } from '@/context/AdminContext'
import { generateInvoiceHTML, generateReceiptHTML, downloadDocument } from '@/lib/utils/invoice-generator'
import { toast } from 'sonner'
import { useCompanySettings } from '@/hooks/use-company-settings'

interface OrderModalsProps {
  order: Order | null
  isOpen: boolean
  onClose: () => void
  onCancelOrder?: (orderId: string) => void
}

export function OrderDetailModal({ order, isOpen, onClose, onCancelOrder }: OrderModalsProps) {
  const { companySettings } = useCompanySettings()
  const { state } = useAdmin()
  const [isInvoiceGenerating, setIsInvoiceGenerating] = useState(false)
  const [isReceiptGenerating, setIsReceiptGenerating] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [orderStatus, setOrderStatus] = useState(order?.status || '')

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

  const handleCancelOrder = () => {
    setOrderStatus('cancelled')
    onCancelOrder?.(order.id)
    toast.success('Venta cancelada exitosamente')
    setShowCancelConfirm(false)
    setTimeout(onClose, 1500)
  }

  const isCancelled = orderStatus === 'cancelled'

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
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
            {isCancelled && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 p-4 rounded-lg">
                <p className="font-semibold">Esta venta ha sido cancelada</p>
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
                      isCancelled
                        ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        : order.status === 'delivered'
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : order.status === 'pending'
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                        : 'bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200'
                    }`}>
                      {isCancelled ? 'Cancelada' : order.status === 'delivered' ? 'Entregada' : order.status === 'pending' ? 'Pendiente' : 'En Proceso'}
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
                  disabled={isCancelled || isInvoiceGenerating}
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
                  disabled={isCancelled || isReceiptGenerating}
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
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={isCancelled}
                  className="flex items-center justify-center gap-2 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition col-span-2 sm:col-span-1"
                >
                  <span>✕</span>
                  {isCancelled ? 'Cancelada' : 'Cancelar Venta'}
                </button>
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
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setShowCancelConfirm(false)}>
          <div className="bg-card rounded-lg shadow-lg max-w-sm w-full mx-4"
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
  )
}
