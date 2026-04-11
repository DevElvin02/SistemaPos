import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext';
import { BarcodeField } from '@/components/BarcodeField';
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { useAdmin } from '@/context/AdminContext'
import { useCompanySettings } from '@/hooks/use-company-settings'

interface CreateOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateOrder?: (order: any) => Promise<boolean | void> | boolean | void
}

type PaymentMethod = 'cash' | 'transfer'
type DocumentType = 'ticket' | 'invoice'

const IVA_RATE = 0.13

export function CreateOrderModal({ isOpen, onClose, onCreateOrder }: CreateOrderModalProps) {
  const { state } = useAdmin()
  const { companySettings } = useCompanySettings()
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [documentType, setDocumentType] = useState<DocumentType>('ticket')
  const [amountReceived, setAmountReceived] = useState('')
  const [printTicket, setPrintTicket] = useState(true)
  const [lineItems, setLineItems] = useState<
    Array<{ id: string; productId: string; productName: string; sku: string; unitPrice: number; quantity: number; subtotal: number }>
  >([])

  const filteredProducts = useMemo(
    () =>
      state.products.filter((p) => {
        const needle = searchTerm.trim().toLowerCase()
        if (!needle) return true
        return p.name.toLowerCase().includes(needle) || p.sku.toLowerCase().includes(needle) || (p.barcode ?? '').toLowerCase().includes(needle)
      }),
    [searchTerm, state.products]
  )

  const subtotal = useMemo(
    () => lineItems.reduce((acc, item) => acc + item.subtotal, 0),
    [lineItems]
  )
  const ivaAmount = useMemo(() => subtotal * IVA_RATE, [subtotal])
  const total = useMemo(() => subtotal + ivaAmount, [subtotal, ivaAmount])
  const totalItems = useMemo(
    () => lineItems.reduce((acc, item) => acc + item.quantity, 0),
    [lineItems]
  )
  const change = useMemo(() => {
    if (paymentMethod !== 'cash') return 0
    const received = parseFloat(amountReceived)
    if (Number.isNaN(received)) return 0
    return Math.max(received - total, 0)
  }, [amountReceived, paymentMethod, total])

  const resetForm = () => {
    setCustomerId('')
    setSearchTerm('')
    setBarcodeInput('')
    setSelectedProductId('')
    setUnitPrice('')
    setQuantity('1')
    setPaymentMethod('cash')
    setDocumentType('ticket')
    setAmountReceived('')
    setPrintTicket(true)
    setLineItems([])
  }

  const addLineItem = (productId: string, productName: string, sku: string, price: number, qty: number) => {
    setLineItems((prev) => {
      const existing = prev.find((item) => item.productId === productId)
      if (existing) {
        return prev.map((item) =>
          item.productId === productId
            ? {
                ...item,
                quantity: item.quantity + qty,
                unitPrice: price,
                subtotal: (item.quantity + qty) * price,
              }
            : item
        )
      }

      return [
        ...prev,
        {
          id: `${productId}-${Date.now()}`,
          productId,
          productName,
          sku,
          unitPrice: price,
          quantity: qty,
          subtotal: price * qty,
        },
      ]
    })
  }

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId)
    const selectedProduct = state.products.find((p) => p.id === productId)
    setUnitPrice(selectedProduct ? selectedProduct.price.toFixed(2) : '')
  }

  const handleAddProduct = () => {
    const selectedProduct = state.products.find((p) => p.id === selectedProductId)
    const parsedPrice = parseFloat(unitPrice)
    const parsedQuantity = parseInt(quantity)

    if (!selectedProduct) {
      toast.error('Selecciona un producto')
      return
    }

    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error('Ingresa un precio unitario válido')
      return
    }

    if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      toast.error('Ingresa una cantidad válida')
      return
    }

    addLineItem(selectedProduct.id, selectedProduct.name, selectedProduct.sku, parsedPrice, parsedQuantity)

    setSelectedProductId('')
    setUnitPrice('')
    setQuantity('1')
    setSearchTerm('')
  }

  const handleBarcodeAdd = () => {
    const barcode = barcodeInput.trim().toLowerCase()
    if (!barcode) {
      toast.error('Ingresa un codigo para escanear')
      return
    }

    const found = state.products.find((p) => p.sku.toLowerCase() === barcode || (p.barcode ?? '').toLowerCase() === barcode)
    if (!found) {
      toast.error('Producto no encontrado por codigo')
      return
    }

    addLineItem(found.id, found.name, found.sku, found.price, 1)
    setBarcodeInput('')
    toast.success(`Agregado: ${found.name}`)
  }

  const handleRemoveLine = (lineId: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== lineId))
  }

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`

  const generateTicket = (order: any) => {
    const popup = window.open('', '_blank', 'width=420,height=640')
    if (!popup) return

    const rows = order.lines
      .map(
        (line: any) => `
          <tr>
            <td>${line.productName}</td>
            <td style="text-align:center">${line.quantity}</td>
            <td style="text-align:right">${formatCurrency(line.unitPrice)}</td>
            <td style="text-align:right">${formatCurrency(line.subtotal)}</td>
          </tr>
        `
      )
      .join('')

    popup.document.write(`
      <html>
        <head>
          <title>${order.documentType === 'invoice' ? 'Factura' : 'Ticket'} ${order.orderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; color: #111; }
            h2, p { margin: 0 0 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border-bottom: 1px solid #ddd; padding: 6px 0; font-size: 12px; }
            .total { margin-top: 12px; font-weight: bold; text-align: right; }
          </style>
        </head>
        <body>
          <h2>${companySettings.companyName} - ${order.documentType === 'invoice' ? 'Factura' : 'Ticket'}</h2>
          <p><strong>Direccion:</strong> ${companySettings.address}</p>
          <p><strong>Pais:</strong> ${companySettings.country}</p>
          <p><strong>Telefono:</strong> ${companySettings.phone}</p>
          <p><strong>Email:</strong> ${companySettings.email}</p>
          <p><strong>Orden:</strong> ${order.orderNumber}</p>
          <p><strong>Cliente:</strong> ${order.customerName}</p>
          <p><strong>Pago:</strong> ${order.payment.method === 'cash' ? 'Efectivo' : 'Transferencia'}</p>
          <p><strong>Fecha:</strong> ${new Date(order.date).toLocaleString('es-ES')}</p>

          <table>
            <thead>
              <tr>
                <th style="text-align:left">Producto</th>
                <th style="text-align:center">Cant.</th>
                <th style="text-align:right">P/U</th>
                <th style="text-align:right">Subtotal</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <p class="total">Subtotal: ${formatCurrency(order.subtotal)}</p>
          <p class="total">IVA (13%): ${formatCurrency(order.tax)}</p>
          <p class="total">Total: ${formatCurrency(order.amount)}</p>
          ${
            order.payment.method === 'cash'
              ? `<p class="total">Recibido: ${formatCurrency(order.payment.received)}</p><p class="total">Cambio: ${formatCurrency(order.payment.change)}</p>`
              : ''
          }
        </body>
      </html>
    `)

    popup.document.close()
    popup.focus()
    popup.print()
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return

      if (event.altKey && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        handleAddProduct()
      }

      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault()
        const form = document.getElementById('pos-sale-form') as HTMLFormElement | null
        form?.requestSubmit()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!customerId) {
      toast.error('Selecciona un cliente')
      return
    }

    if (lineItems.length === 0) {
      toast.error('Agrega al menos un producto a la venta')
      return
    }

    const received = parseFloat(amountReceived)
    if (paymentMethod === 'cash') {
      if (Number.isNaN(received) || received <= 0) {
        toast.error('Ingresa el monto recibido en efectivo')
        return
      }

      if (received < total) {
        toast.error('El monto recibido no cubre el total de la venta')
        return
      }
    }

    const newOrder = {
      id: Date.now().toString(),
      customerId,
      subtotal,
      tax: ivaAmount,
      amount: total,
      items: totalItems,
      status: 'pending',
      orderNumber: `ORD-${Date.now()}`,
      customerName: state.customers.find(c => c.id === customerId)?.name || '',
      date: new Date().toISOString(),
      lines: lineItems,
      documentType,
      payment: {
        method: paymentMethod,
        received: paymentMethod === 'cash' ? received : total,
        change: paymentMethod === 'cash' ? change : 0,
      },
    }

    const created = await onCreateOrder?.(newOrder)
    if (created === false) {
      return
    }

    toast.success('Venta creada exitosamente')
    if (printTicket) {
      generateTicket(newOrder)
    }
    resetForm()
    onClose()
  }

  if (!isOpen) return null
  if (typeof document === 'undefined') return null

  return createPortal((
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-[0_28px_60px_-35px_rgba(15,23,42,0.8)] border border-border/70 w-full max-w-[1180px] h-[calc(100vh-1rem)] sm:h-[94vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-primary to-primary/85 text-primary-foreground px-6 py-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Nueva Venta</h2>
              <p className="text-sm text-primary-foreground/85">Registra productos, pago y comprobante en una sola vista</p>
            </div>
            <button onClick={onClose} className="text-primary-foreground hover:bg-primary/70 p-2 rounded-xl transition">
              ✕
            </button>
          </div>
        </div>

        <form id="pos-sale-form" onSubmit={handleSubmit} className="flex flex-col h-[calc(100%-84px)] min-h-0">
          <div className="p-4 sm:p-5 overflow-y-auto min-h-0">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 space-y-4">
              <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
                <label className="block text-sm font-semibold mb-2">Cliente</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                >
                  <option value="">Seleccionar cliente...</option>
                  {state.customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Buscar producto</label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Nombre, SKU o código"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Escaneo de código de barras</label>
                    <BarcodeField
                      userRole={user?.role === 'admin' ? 'admin' : user?.role === 'cajero' ? 'cajero' : 'otro'}
                      onBarcode={(code) => {
                        setBarcodeInput(code);
                        // Simula el mismo flujo que handleBarcodeAdd pero automático
                        const barcode = code.trim().toLowerCase();
                        const found = state.products.find((p) => p.sku.toLowerCase() === barcode || (p.barcode ?? '').toLowerCase() === barcode);
                        if (!found) {
                          toast.error('Producto no encontrado por codigo');
                          return;
                        }
                        addLineItem(found.id, found.name, found.sku, found.price, 1);
                        setBarcodeInput('');
                        toast.success(`Agregado: ${found.name}`);
                      }}
                      placeholder="Escanear SKU o código de barras"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-1">Producto</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => handleProductChange(e.target.value)}
                      className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                    >
                      <option value="">Seleccionar producto...</option>
                      {filteredProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">Precio unitario</label>
                    <input
                      type="number"
                      step="0.01"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="1"
                    />
                  </div>

                  <div className="md:min-w-[120px]">
                    <button
                      type="button"
                      onClick={handleAddProduct}
                      className="w-full px-3 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition font-semibold"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </div>

              <div className="border border-border/70 rounded-xl overflow-hidden bg-card">
                <div className="overflow-x-auto">
                  <div className="min-w-[680px]">
                    <div className="grid grid-cols-12 gap-2 px-3 py-2.5 bg-muted/50 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      <span className="col-span-5">Producto</span>
                      <span className="col-span-2 text-right">Precio</span>
                      <span className="col-span-2 text-right">Cantidad</span>
                      <span className="col-span-2 text-right">Subtotal</span>
                      <span className="col-span-1 text-right">Acción</span>
                    </div>

                    {lineItems.length === 0 ? (
                      <p className="px-4 py-10 text-sm text-muted-foreground text-center">No hay productos agregados.</p>
                    ) : (
                      lineItems.map((line) => (
                        <div key={line.id} className="grid grid-cols-12 gap-2 px-3 py-3 border-t border-border/70 text-sm items-center">
                          <span className="col-span-5 font-medium text-secondary">
                            {line.productName}
                            <span className="ml-2 text-xs text-muted-foreground">{line.sku}</span>
                          </span>
                          <span className="col-span-2 text-right">${line.unitPrice.toFixed(2)}</span>
                          <span className="col-span-2 text-right">{line.quantity}</span>
                          <span className="col-span-2 text-right font-semibold">${line.subtotal.toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(line.id)}
                            className="col-span-1 text-right text-destructive hover:underline"
                          >
                            Quitar
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3 xl:sticky xl:top-0">
                <h3 className="font-semibold text-secondary">Cobro y comprobante</h3>

                <div>
                  <label className="block text-sm font-semibold mb-1">Documento</label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                    className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                  >
                    <option value="ticket">Ticket</option>
                    <option value="invoice">Factura</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Método de pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                  >
                    <option value="cash">Efectivo</option>
                    <option value="transfer">Transferencia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">
                    {paymentMethod === 'cash' ? 'Monto recibido' : 'Referencia'}
                  </label>
                  {paymentMethod === 'cash' ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="0.00"
                    />
                  ) : (
                    <input
                      type="text"
                      className="w-full px-3 py-2.5 border border-border rounded-xl bg-background"
                      placeholder="Transferencia registrada"
                      disabled
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Cambio</label>
                  <div className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground font-semibold">
                    {paymentMethod === 'cash' ? formatCurrency(change) : '$0.00'}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-3 text-sm space-y-1">
                  <p className="text-muted-foreground">Total de artículos: <span className="font-medium text-secondary">{totalItems}</span></p>
                  <p className="text-muted-foreground">Subtotal: <span className="font-medium text-secondary">{formatCurrency(subtotal)}</span></p>
                  <p className="text-muted-foreground">IVA (13%): <span className="font-medium text-secondary">{formatCurrency(ivaAmount)}</span></p>
                  <p className="text-xl font-bold text-secondary pt-1">Total: {formatCurrency(total)}</p>
                </div>

                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={printTicket}
                    onChange={(e) => setPrintTicket(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Generar ${documentType === 'invoice' ? 'factura' : 'ticket'} al guardar
                </label>

                <p className="text-xs text-muted-foreground">Atajos: Alt + A agrega producto, Ctrl + Enter registra venta</p>
              </div>
            </div>
          </div>
          </div>

          <div className="sticky bottom-0 z-20 border-t border-border/70 bg-muted/95 px-4 py-3 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border hover:bg-muted transition font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition font-semibold"
            >
              Registrar Venta
            </button>
          </div>
        </form>
      </div>
    </div>
  ), document.body)
}
