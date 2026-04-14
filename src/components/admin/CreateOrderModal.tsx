import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { useAdmin } from '@/context/AdminContext'
import { useCompanySettings } from '@/hooks/use-company-settings'
import { generateInvoiceHTML, generateReceiptHTML, printDocument } from '@/lib/utils/invoice-generator'
import type { Order } from '@/lib/data/orders'
import { useAuth } from '@/context/AuthContext'

interface CreateOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateOrder?: (order: any) => Promise<boolean | void> | boolean | void
}

type PaymentMethod = 'cash' | 'transfer'
type DocumentType = 'ticket' | 'invoice'

const IVA_RATE = 0.0 // Cambia al porcentaje de IVA que corresponda, por ejemplo 0.13 para 13%
const roundMoney = (value: number) => Number(value.toFixed(2))

export function CreateOrderModal({ isOpen, onClose, onCreateOrder }: CreateOrderModalProps) {
  const { state } = useAdmin()
  const { companySettings } = useCompanySettings()
  const { user } = useAuth()
  const barcodeInputRef = useRef<HTMLInputElement | null>(null)
  const scannerBufferRef = useRef('')
  const scannerResetTimerRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [isScannerMode, setIsScannerMode] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [lineDiscountPercent, setLineDiscountPercent] = useState('0')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [documentType, setDocumentType] = useState<DocumentType>('ticket')
  const [amountReceived, setAmountReceived] = useState('')
  const [printTicket, setPrintTicket] = useState(true)
  const [isCustomerSuggestionsOpen, setIsCustomerSuggestionsOpen] = useState(false)
  const [isProductSuggestionsOpen, setIsProductSuggestionsOpen] = useState(false)
  const [lineItems, setLineItems] = useState<
    Array<{ id: string; productId: string; productName: string; sku: string; unitPrice: number; quantity: number; baseTotal: number; discountPercent: number; discountAmount: number; subtotal: number }>
  >([])

  const filteredCustomers = useMemo(
    () =>
      state.customers.filter((customer) => {
        const needle = customerSearchTerm.trim().toLowerCase()
        if (!needle) return true
        return customer.name.toLowerCase().includes(needle) || customer.email.toLowerCase().includes(needle) || customer.phone.toLowerCase().includes(needle)
      }).slice(0, 8),
    [customerSearchTerm, state.customers]
  )

  const filteredProducts = useMemo(
    () =>
      state.products.filter((p) => {
        const needle = searchTerm.trim().toLowerCase()
        if (!needle) return true
        return p.name.toLowerCase().includes(needle) || p.sku.toLowerCase().includes(needle) || (p.barcode ?? '').toLowerCase().includes(needle)
      }).slice(0, 8),
    [searchTerm, state.products]
  )

  const grossSubtotal = useMemo(
    () => roundMoney(lineItems.reduce((acc, item) => acc + item.baseTotal, 0)),
    [lineItems]
  )
  const discountAmount = useMemo(
    () => roundMoney(lineItems.reduce((acc, item) => acc + item.discountAmount, 0)),
    [lineItems]
  )
  const discountedSubtotal = useMemo(
    () => roundMoney(lineItems.reduce((acc, item) => acc + item.subtotal, 0)),
    [lineItems]
  )
  const ivaAmount = useMemo(() => roundMoney(discountedSubtotal * IVA_RATE), [discountedSubtotal])
  const total = useMemo(() => roundMoney(discountedSubtotal + ivaAmount), [discountedSubtotal, ivaAmount])
  const totalItems = useMemo(
    () => lineItems.reduce((acc, item) => acc + item.quantity, 0),
    [lineItems]
  )
  const change = useMemo(() => {
    if (paymentMethod !== 'cash') return 0
    const received = parseFloat(amountReceived)
    if (Number.isNaN(received)) return 0
    return roundMoney(Math.max(received - total, 0))
  }, [amountReceived, paymentMethod, total])

  const resetForm = () => {
    setCustomerId('')
    setCustomerSearchTerm('')
    setSearchTerm('')
    setBarcodeInput('')
    scannerBufferRef.current = ''
    setSelectedProductId('')
    setUnitPrice('')
    setQuantity('1')
    setLineDiscountPercent('0')
    setPaymentMethod('cash')
    setDocumentType('ticket')
    setAmountReceived('')
    setPrintTicket(true)
    setIsScannerMode(false)
    setIsCustomerSuggestionsOpen(false)
    setIsProductSuggestionsOpen(false)
    setLineItems([])
  }

  const addLineItem = (productId: string, productName: string, sku: string, price: number, qty: number, discountPercentValue: number) => {
    setLineItems((prev) => {
      const baseTotal = price * qty
      const discountAmountValue = Number((baseTotal * (discountPercentValue / 100)).toFixed(2))
      const subtotalValue = Number((baseTotal - discountAmountValue).toFixed(2))
      const existing = prev.find((item) => item.productId === productId)
      if (existing) {
        const mergedQuantity = existing.quantity + qty
        const mergedBaseTotal = Number((mergedQuantity * price).toFixed(2))
        const mergedDiscountPercent = discountPercentValue
        const mergedDiscountAmount = Number((mergedBaseTotal * (mergedDiscountPercent / 100)).toFixed(2))
        const mergedSubtotal = Number((mergedBaseTotal - mergedDiscountAmount).toFixed(2))
        return prev.map((item) =>
          item.productId === productId
            ? {
                ...item,
                quantity: mergedQuantity,
                unitPrice: price,
                baseTotal: mergedBaseTotal,
                discountPercent: mergedDiscountPercent,
                discountAmount: mergedDiscountAmount,
                subtotal: mergedSubtotal,
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
          baseTotal,
          discountPercent: discountPercentValue,
          discountAmount: discountAmountValue,
          subtotal: subtotalValue,
        },
      ]
    })
  }

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId)
    const selectedProduct = state.products.find((p) => p.id === productId)
    setSearchTerm(selectedProduct?.name ?? '')
    setUnitPrice(selectedProduct ? selectedProduct.price.toFixed(2) : '')
    setIsProductSuggestionsOpen(false)
  }

  const handleCustomerChange = (customerIdValue: string) => {
    setCustomerId(customerIdValue)
    const selectedCustomer = state.customers.find((customer) => customer.id === customerIdValue)
    setCustomerSearchTerm(selectedCustomer?.name ?? '')
    setIsCustomerSuggestionsOpen(false)
  }

  const handleAddProduct = () => {
    const selectedProduct = state.products.find((p) => p.id === selectedProductId)
    const parsedPrice = parseFloat(unitPrice)
    const parsedQuantity = parseInt(quantity)
    const parsedDiscountPercent = parseFloat(lineDiscountPercent)

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

    if (Number.isNaN(parsedDiscountPercent) || parsedDiscountPercent < 0 || parsedDiscountPercent > 100) {
      toast.error('Ingresa un descuento válido entre 0 y 100')
      return
    }

    addLineItem(selectedProduct.id, selectedProduct.name, selectedProduct.sku, parsedPrice, parsedQuantity, parsedDiscountPercent)

    setSelectedProductId('')
    setUnitPrice('')
    setQuantity('1')
    setLineDiscountPercent('0')
    setSearchTerm('')
    setIsProductSuggestionsOpen(false)
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

    addLineItem(found.id, found.name, found.sku, found.price, 1, 0)
    setBarcodeInput('')
    scannerBufferRef.current = ''
    playScanSuccessTone()
    toast.success(`Agregado: ${found.name}`)
  }

  const playScanSuccessTone = () => {
    if (typeof window === 'undefined') return

    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    const audioContext = audioContextRef.current ?? new AudioContextClass()
    audioContextRef.current = audioContext

    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    const startAt = audioContext.currentTime

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, startAt)
    oscillator.frequency.exponentialRampToValueAtTime(1320, startAt + 0.08)

    gainNode.gain.setValueAtTime(0.001, startAt)
    gainNode.gain.exponentialRampToValueAtTime(0.08, startAt + 0.02)
    gainNode.gain.exponentialRampToValueAtTime(0.001, startAt + 0.12)

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.start(startAt)
    oscillator.stop(startAt + 0.12)
  }

  const armUsbScanner = () => {
    setIsScannerMode(true)
    setBarcodeInput('')
    scannerBufferRef.current = ''
    window.setTimeout(() => {
      barcodeInputRef.current?.focus()
      barcodeInputRef.current?.select()
    }, 0)
  }

  const commitScannerBuffer = () => {
    const capturedValue = scannerBufferRef.current.trim()
    if (!capturedValue) return

    setBarcodeInput(capturedValue)
    scannerBufferRef.current = capturedValue

    window.setTimeout(() => {
      handleBarcodeAdd()
    }, 0)
  }

  const handleRemoveLine = (lineId: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== lineId))
  }

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`

  const printSaleDocument = (order: Order & { documentType: DocumentType }) => {
    const customer = state.customers.find((item) => item.id === order.customerId)
    const invoiceData = {
      order,
      customerName: order.customerName,
      customerEmail: customer?.email || 'cliente@motorepuestos.com',
      cashierName: order.cashierName || user?.name || 'Cajero no disponible',
      companyName: companySettings.companyName,
      companyAddress: companySettings.address,
      companyEmail: companySettings.email,
      companyPhone: companySettings.phone,
      companyCountry: companySettings.country,
      invoiceDate: new Date().toLocaleDateString('es-ES'),
    }

    const html = order.documentType === 'invoice'
      ? generateInvoiceHTML(invoiceData)
      : generateReceiptHTML(invoiceData)

    printDocument(html)
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

      if (!isScannerMode) return

      if (event.key === 'Escape') {
        setIsScannerMode(false)
        setBarcodeInput('')
        scannerBufferRef.current = ''
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        commitScannerBuffer()
        return
      }

      if (event.key.length !== 1) return
      if (event.ctrlKey || event.metaKey || event.altKey) return

      scannerBufferRef.current += event.key
      setBarcodeInput(scannerBufferRef.current)

      if (scannerResetTimerRef.current) {
        window.clearTimeout(scannerResetTimerRef.current)
      }

      scannerResetTimerRef.current = window.setTimeout(() => {
        scannerBufferRef.current = ''
      }, 150)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (scannerResetTimerRef.current) {
        window.clearTimeout(scannerResetTimerRef.current)
      }
    }
  }, [isOpen, isScannerMode])

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

    const received = roundMoney(parseFloat(amountReceived))
    if (paymentMethod === 'cash') {
      if (Number.isNaN(received) || received <= 0) {
        toast.error('Ingresa el monto recibido en efectivo')
        return
      }

      if (roundMoney(received - total) < 0) {
        toast.error('El monto recibido no cubre el total a pagar con descuento')
        return
      }
    }

    const newOrder = {
      id: Date.now().toString(),
      customerId,
      grossSubtotal,
      subtotal: discountedSubtotal,
      tax: ivaAmount,
      discountAmount,
      amount: total,
      items: totalItems,
      status: 'delivered' as const,
      orderNumber: `ORD-${Date.now()}`,
      customerName: state.customers.find(c => c.id === customerId)?.name || '',
      cashierName: user?.name || 'Cajero no disponible',
      date: new Date(),
      lines: lineItems.map((line) => ({
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        baseTotal: line.baseTotal,
        discountPercent: line.discountPercent,
        discountAmount: line.discountAmount,
        lineTotal: line.subtotal,
      })),
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
      printSaleDocument(newOrder)
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
                <div className="relative">
                  <input
                    type="text"
                    value={customerSearchTerm}
                    onChange={(e) => {
                      setCustomerSearchTerm(e.target.value)
                      setCustomerId('')
                      setIsCustomerSuggestionsOpen(true)
                    }}
                    onFocus={() => setIsCustomerSuggestionsOpen(true)}
                    className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                    placeholder="Escribe el nombre del cliente"
                  />

                  {isCustomerSuggestionsOpen && customerSearchTerm.trim() && filteredCustomers.length > 0 && (
                    <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-border bg-background shadow-lg">
                      {filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onMouseDown={() => handleCustomerChange(customer.id)}
                          className="flex w-full flex-col px-3 py-2 text-left hover:bg-muted transition"
                        >
                          <span className="font-medium text-secondary">{customer.name}</span>
                          <span className="text-xs text-muted-foreground">{customer.email} {customer.phone ? `• ${customer.phone}` : ''}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Buscar producto</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value)
                          setSelectedProductId('')
                          setUnitPrice('')
                          setIsProductSuggestionsOpen(true)
                        }}
                        onFocus={() => setIsProductSuggestionsOpen(true)}
                        className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Nombre, SKU o código"
                      />

                      {isProductSuggestionsOpen && searchTerm.trim() && filteredProducts.length > 0 && (
                        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-border bg-background shadow-lg">
                          {filteredProducts.map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              onMouseDown={() => handleProductChange(product.id)}
                              className="flex w-full flex-col px-3 py-2 text-left hover:bg-muted transition"
                            >
                              <span className="font-medium text-secondary">{product.name}</span>
                              <span className="text-xs text-muted-foreground">SKU: {product.sku} • Precio: ${product.price.toFixed(2)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Escaneo de código de barras</label>
                    <div className="flex gap-2">
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onFocus={() => setIsScannerMode(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleBarcodeAdd()
                          }
                        }}
                        className="flex-1 px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Escanear SKU y Enter"
                      />
                      <button
                        type="button"
                        onClick={armUsbScanner}
                        className="px-3 py-2.5 rounded-xl border border-border hover:bg-muted transition font-medium"
                      >
                        Escanear
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isScannerMode ? 'Modo scanner activo: lee el codigo con el lector USB.' : 'Haz clic en Escanear para capturar una lectura desde el scanner USB.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
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

                  <div>
                    <label className="block text-sm font-semibold mb-1">Desc. %</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={lineDiscountPercent}
                      onChange={(e) => setLineDiscountPercent(e.target.value)}
                      className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="0"
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
                    <div className="grid grid-cols-14 gap-2 px-3 py-2.5 bg-muted/50 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      <span className="col-span-4">Producto</span>
                      <span className="col-span-2 text-right">Precio</span>
                      <span className="col-span-2 text-right">Cantidad</span>
                      <span className="col-span-2 text-right">Desc. %</span>
                      <span className="col-span-2 text-right">Subtotal</span>
                      <span className="col-span-2 text-right">Acción</span>
                    </div>

                    {lineItems.length === 0 ? (
                      <p className="px-4 py-10 text-sm text-muted-foreground text-center">No hay productos agregados.</p>
                    ) : (
                      lineItems.map((line) => (
                        <div key={line.id} className="grid grid-cols-14 gap-2 px-3 py-3 border-t border-border/70 text-sm items-center">
                          <span className="col-span-4 font-medium text-secondary">
                            {line.productName}
                            <span className="ml-2 text-xs text-muted-foreground">{line.sku}</span>
                          </span>
                          <span className="col-span-2 text-right">${line.unitPrice.toFixed(2)}</span>
                          <span className="col-span-2 text-right">{line.quantity}</span>
                          <span className="col-span-2 text-right">{line.discountPercent.toFixed(2)}%</span>
                          <span className="col-span-2 text-right font-semibold">${line.subtotal.toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(line.id)}
                            className="col-span-2 text-right text-destructive hover:underline"
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
                  <p className="text-muted-foreground">Precio original: <span className="font-medium text-secondary">{formatCurrency(grossSubtotal)}</span></p>
                  <p className="text-muted-foreground">Descuento total: <span className="font-medium text-secondary">-{formatCurrency(discountAmount)}</span></p>
                  <p className="text-muted-foreground">Total con descuento: <span className="font-medium text-secondary">{formatCurrency(discountedSubtotal)}</span></p>
                  <p className="text-muted-foreground">IVA (0%): <span className="font-medium text-secondary">{formatCurrency(ivaAmount)}</span></p>
                  <p className="text-xl font-bold text-secondary pt-1">Total a pagar: {formatCurrency(total)}</p>
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
