'use client'

import { useEffect, useMemo, useState } from 'react'
import { customers } from '@/lib/data/customers'
import { products } from '@/lib/data/products'
import { toast } from 'sonner'

interface CreateOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateOrder?: (order: any) => void
}

type PaymentMethod = 'cash' | 'transfer'
type DocumentType = 'ticket' | 'invoice'

const IVA_RATE = 0.13

export function CreateOrderModal({ isOpen, onClose, onCreateOrder }: CreateOrderModalProps) {
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
      products.filter((p) => {
        const needle = searchTerm.trim().toLowerCase()
        if (!needle) return true
        return p.name.toLowerCase().includes(needle) || p.sku.toLowerCase().includes(needle)
      }),
    [searchTerm]
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
    const selectedProduct = products.find((p) => p.id === productId)
    setUnitPrice(selectedProduct ? selectedProduct.price.toFixed(2) : '')
  }

  const handleAddProduct = () => {
    const selectedProduct = products.find((p) => p.id === selectedProductId)
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

    const found = products.find((p) => p.sku.toLowerCase() === barcode)
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
          <h2>Sublimart POS - ${order.documentType === 'invoice' ? 'Factura' : 'Ticket'}</h2>
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
        const form = document.getElementById('pos-sale-form-next') as HTMLFormElement | null
        form?.requestSubmit()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const handleSubmit = (e: React.FormEvent) => {
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
      customerName: customers.find(c => c.id === customerId)?.name || '',
      date: new Date().toISOString(),
      lines: lineItems,
      documentType,
      payment: {
        method: paymentMethod,
        received: paymentMethod === 'cash' ? received : total,
        change: paymentMethod === 'cash' ? change : 0,
      },
    }

    onCreateOrder?.(newOrder)
    toast.success('Venta creada exitosamente')
    if (printTicket) {
      generateTicket(newOrder)
    }
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-card rounded-lg shadow-lg max-w-3xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Nueva Venta</h2>
            <button onClick={onClose} className="text-primary-foreground hover:bg-primary/80 p-2 rounded transition">
              ✕
            </button>
          </div>
        </div>

        <form id="pos-sale-form-next" onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Cliente</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            >
              <option value="">Seleccionar cliente...</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Buscar producto (nombre o codigo)</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ej: Coffee o CB-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Escaneo de codigo de barras (SKU)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleBarcodeAdd()
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Escanear SKU y Enter"
                />
                <button
                  type="button"
                  onClick={handleBarcodeAdd}
                  className="px-3 py-2 rounded-lg border border-border hover:bg-muted transition"
                >
                  Escanear
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Producto</label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
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
              <label className="block text-sm font-medium mb-1">Precio unitario</label>
              <input
                type="number"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Cantidad</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="1"
              />
            </div>

            <div>
              <button
                type="button"
                onClick={handleAddProduct}
                className="w-full px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition"
              >
                Agregar
              </button>
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/60 text-xs font-semibold uppercase tracking-wide">
              <span className="col-span-5">Producto</span>
              <span className="col-span-2 text-right">Precio</span>
              <span className="col-span-2 text-right">Cantidad</span>
              <span className="col-span-2 text-right">Subtotal</span>
              <span className="col-span-1 text-right">Acción</span>
            </div>

            {lineItems.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">No hay productos agregados.</p>
            ) : (
              lineItems.map((line) => (
                <div key={line.id} className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-border text-sm items-center">
                  <span className="col-span-5">
                    {line.productName}
                    <span className="ml-2 text-xs text-muted-foreground">{line.sku}</span>
                  </span>
                  <span className="col-span-2 text-right">${line.unitPrice.toFixed(2)}</span>
                  <span className="col-span-2 text-right">{line.quantity}</span>
                  <span className="col-span-2 text-right font-medium">${line.subtotal.toFixed(2)}</span>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg border border-border bg-muted/20">
            <div>
              <label className="block text-sm font-medium mb-1">Documento</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              >
                <option value="ticket">Ticket</option>
                <option value="invoice">Factura</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Metodo de pago</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              >
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {paymentMethod === 'cash' ? 'Monto recibido' : 'Referencia'}
              </label>
              {paymentMethod === 'cash' ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0.00"
                />
              ) : (
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  placeholder="Transferencia registrada"
                  disabled
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Cambio</label>
              <div className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground font-medium">
                {paymentMethod === 'cash' ? formatCurrency(change) : '$0.00'}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total de artículos: {totalItems}</p>
              <p className="text-sm text-muted-foreground">Subtotal: {formatCurrency(subtotal)}</p>
              <p className="text-sm text-muted-foreground">IVA (13%): {formatCurrency(ivaAmount)}</p>
              <p className="text-xl font-bold text-foreground">Total: {formatCurrency(total)}</p>
              <p className="text-xs text-muted-foreground mt-1">Atajos: Alt + A agrega producto, Ctrl + Enter registra venta</p>
            </div>
          </div>
        </form>

        <div className="bg-muted/50 border-t p-4 flex justify-end gap-3">
          <label className="mr-auto flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={printTicket}
              onChange={(e) => setPrintTicket(e.target.checked)}
              className="w-4 h-4"
            />
            Generar ${documentType === 'invoice' ? 'factura' : 'ticket'} al guardar
          </label>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition"
          >
            Cancelar
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              handleSubmit(e as any)
            }}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition"
          >
            Registrar Venta
          </button>
        </div>
      </div>
    </div>
  )
}
