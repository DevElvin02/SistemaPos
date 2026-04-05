import { useMemo, useState } from 'react'
import { FileText, Printer, FileDown, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useAdmin } from '@/context/AdminContext'
import {
  generateInvoiceHTML,
  generateReceiptHTML,
  downloadDocument,
  printDocument,
  generateTicketPDF,
} from '@/lib/utils/invoice-generator'
import { useCompanySettings } from '@/hooks/use-company-settings'
import type { Order } from '@/lib/data/orders'

export default function Tickets() {
  const { state } = useAdmin()
  const { companySettings } = useCompanySettings()
  const [search, setSearch] = useState('')

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return state.orders

    return state.orders.filter((order) => {
      return (
        order.orderNumber.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query)
      )
    })
  }, [search, state.orders])

  const getCustomerEmail = (order: Order) => {
    const customer = state.customers.find((c) => c.id === order.customerId)
    return customer?.email || 'cliente@sublimart.com'
  }

  const getInvoiceData = (order: Order) => ({
    order,
    customerName: order.customerName,
    customerEmail: getCustomerEmail(order),
    companyName: companySettings.companyName,
    companyAddress: companySettings.address,
    companyEmail: companySettings.email,
    companyPhone: companySettings.phone,
    companyCountry: companySettings.country,
    invoiceDate: new Date().toLocaleDateString('es-ES'),
  })

  const handleGenerateComprobante = (order: Order) => {
    try {
      const html = generateInvoiceHTML(getInvoiceData(order))
      downloadDocument(html, `Comprobante-${order.orderNumber}.html`)
      toast.success(`Comprobante generado para ${order.orderNumber}`)
    } catch {
      toast.error('No se pudo generar el comprobante')
    }
  }

  const handlePrintTicket = (order: Order) => {
    try {
      const html = generateReceiptHTML(getInvoiceData(order))
      printDocument(html)
      toast.success(`Ticket enviado a impresion: ${order.orderNumber}`)
    } catch {
      toast.error('No se pudo imprimir el ticket')
    }
  }

  const handleDownloadPDF = (order: Order) => {
    try {
      generateTicketPDF(getInvoiceData(order), `Ticket-${order.orderNumber}.pdf`)
      toast.success(`PDF generado para ${order.orderNumber}`)
    } catch {
      toast.error('No se pudo generar el PDF')
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tickets / Facturacion</h1>
          <p className="text-muted-foreground mt-1">Genera comprobantes, imprime tickets y descarga PDF</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Buscar por numero de orden o cliente..."
            className="pl-10 w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left p-3 font-semibold">Orden</th>
                <th className="text-left p-3 font-semibold">Cliente</th>
                <th className="text-left p-3 font-semibold">Fecha</th>
                <th className="text-right p-3 font-semibold">Total</th>
                <th className="text-center p-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center p-6 text-muted-foreground">
                    No hay ventas para mostrar
                  </td>
                </tr>
              )}
              {filteredOrders.map((order) => {
                const isCancelled = order.status === 'cancelled'
                return (
                  <tr key={order.id} className="border-b border-border last:border-b-0">
                    <td className="p-3 font-medium">{order.orderNumber}</td>
                    <td className="p-3">{order.customerName}</td>
                    <td className="p-3">{new Date(order.date).toLocaleDateString('es-ES')}</td>
                    <td className="p-3 text-right font-semibold">${order.amount.toFixed(2)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          onClick={() => handleGenerateComprobante(order)}
                          disabled={isCancelled}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Generar comprobante"
                        >
                          <FileText className="w-4 h-4" />
                          Comprobante
                        </button>
                        <button
                          onClick={() => handlePrintTicket(order)}
                          disabled={isCancelled}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Imprimir ticket"
                        >
                          <Printer className="w-4 h-4" />
                          Imprimir
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(order)}
                          disabled={isCancelled}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Descargar PDF"
                        >
                          <FileDown className="w-4 h-4" />
                          PDF
                        </button>
                      </div>
                      {isCancelled && (
                        <p className="text-center text-xs text-destructive mt-1">Venta cancelada</p>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
