import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { showToast } from '@/lib/swal';
import { useAdmin } from '@/context/AdminContext'
import { useCompanySettings } from '@/hooks/use-company-settings'
import { generateInvoiceHTML, printDocument, printPlainTextReceipt } from '@/lib/utils/invoice-generator'
import type { Order } from '@/lib/data/orders'
import { useAuth } from '@/context/AuthContext'
import { sanitizeDecimalInput, sanitizeIntegerInput } from '@/lib/validators'

interface CreateOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateOrder?: (order: any) => Promise<boolean | void> | boolean | void
}

type PaymentMethod = 'cash' | 'transfer'
type DocumentType = 'ticket' | 'invoice'

const IVA_RATE = 0.0 // Cambia al porcentaje de IVA que corresponda, por ejemplo 0.13 para 13%
const roundMoney = (value: number) => Number(value.toFixed(2))
const normalizeCustomerType = (value?: string) => String(value ?? '').trim().toLowerCase()

export function CreateOrderModal({ isOpen, onClose, onCreateOrder }: CreateOrderModalProps) {
  const { state } = useAdmin()
  const { companySettings } = useCompanySettings()
  const { user } = useAuth()
  const scannerBufferRef = useRef('')
  const scannerResetTimerRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const [selectedProductId, setSelectedProductId] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [discountedUnitPrice, setDiscountedUnitPrice] = useState('')
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

  const selectedCustomer = useMemo(
    () => state.customers.find((customer) => customer.id === customerId),
    [customerId, state.customers]
  )
  const isWholesaleCustomer = normalizeCustomerType(selectedCustomer?.customerType) === 'mayorista'
  const parsedOriginalPrice = parseFloat(unitPrice)
  const parsedManualPrice = parseFloat(discountedUnitPrice)
  const hasValidOriginalPrice = !Number.isNaN(parsedOriginalPrice) && parsedOriginalPrice > 0
  const hasManualPrice = !Number.isNaN(parsedManualPrice)
  const isManualPriceAboveOriginal = hasValidOriginalPrice && hasManualPrice && parsedManualPrice > parsedOriginalPrice
  const currentLineDiscountAmount = isWholesaleCustomer && hasValidOriginalPrice && hasManualPrice && parsedManualPrice <= parsedOriginalPrice
    ? roundMoney(parsedOriginalPrice - parsedManualPrice)
    : 0
  const currentLineDiscountPercent = isWholesaleCustomer && hasValidOriginalPrice && hasManualPrice && parsedManualPrice <= parsedOriginalPrice
    ? roundMoney((currentLineDiscountAmount / parsedOriginalPrice) * 100)
    : 0

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
    scannerBufferRef.current = ''
    setSelectedProductId('')
    setUnitPrice('')
    setDiscountedUnitPrice('')
    setQuantity('1')
    setLineDiscountPercent('0')
    setPaymentMethod('cash')
    setDocumentType('ticket')
    setAmountReceived('')
    setPrintTicket(true)
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
    setDiscountedUnitPrice(selectedProduct ? selectedProduct.price.toFixed(2) : '')
    setLineDiscountPercent('0')
    setIsProductSuggestionsOpen(false)
  }

  const handleDiscountedUnitPriceChange = (value: string) => {
    setDiscountedUnitPrice(value)

    const parsedPrice = parseFloat(unitPrice)
    const parsedFinalPrice = parseFloat(value)

    if (!isWholesaleCustomer) {
      setLineDiscountPercent('0')
      setDiscountedUnitPrice(unitPrice)
      return
    }

    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setLineDiscountPercent('0')
      return
    }

    if (Number.isNaN(parsedFinalPrice)) {
      setLineDiscountPercent('0')
      return
    }

    if (parsedFinalPrice > parsedPrice) {
      setLineDiscountPercent('0')
      return
    }

    const boundedFinalPrice = Math.max(parsedFinalPrice, 0)
    const calculatedDiscountPercent = roundMoney(((parsedPrice - boundedFinalPrice) / parsedPrice) * 100)
    setLineDiscountPercent(calculatedDiscountPercent.toFixed(2))
  }

  const handleDiscountPercentChange = (value: string) => {
    setLineDiscountPercent(value)

    if (!isWholesaleCustomer) {
      setDiscountedUnitPrice(unitPrice)
      setLineDiscountPercent('0')
      return
    }

    const parsedPrice = parseFloat(unitPrice)
    const parsedDiscountPercent = parseFloat(value)

    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setDiscountedUnitPrice('')
      return
    }

    if (Number.isNaN(parsedDiscountPercent)) {
      setDiscountedUnitPrice(unitPrice)
      setLineDiscountPercent('0')
      return
    }

    const boundedDiscountPercent = Math.min(Math.max(parsedDiscountPercent, 0), 100)
    const discountedPrice = roundMoney(parsedPrice - (parsedPrice * boundedDiscountPercent / 100))
    setDiscountedUnitPrice(discountedPrice.toFixed(2))
    setLineDiscountPercent(boundedDiscountPercent.toFixed(2))
  }

  const handleCustomerChange = (customerIdValue: string) => {
    setCustomerId(customerIdValue)
    const selectedCustomer = state.customers.find((customer) => customer.id === customerIdValue)
    const isWholesaleSelection = normalizeCustomerType(selectedCustomer?.customerType) === 'mayorista'
    setCustomerSearchTerm(selectedCustomer?.name ?? '')
    setIsCustomerSuggestionsOpen(false)

    if (unitPrice) {
      const nextPrice = isWholesaleSelection ? discountedUnitPrice || unitPrice : unitPrice
      setDiscountedUnitPrice(nextPrice)
      setLineDiscountPercent(isWholesaleSelection ? lineDiscountPercent : '0')
    }
  }

  const handleAddProduct = () => {
    const selectedProduct = state.products.find((p) => p.id === selectedProductId)
    const parsedPrice = parseFloat(unitPrice)
    const parsedDiscountedPrice = parseFloat(discountedUnitPrice)
    const parsedQuantity = parseInt(quantity)
    const effectiveDiscountedPrice = isWholesaleCustomer ? parsedDiscountedPrice : parsedPrice
    const calculatedDiscountPercent = isWholesaleCustomer && !Number.isNaN(effectiveDiscountedPrice) && parsedPrice > 0
      ? roundMoney(((parsedPrice - effectiveDiscountedPrice) / parsedPrice) * 100)
      : 0

    if (!selectedProduct) {
      showToast('Selecciona un producto', 'error')
      return
    }

    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      showToast('Ingresa un precio unitario válido', 'error')
      return
    }

    if (Number.isNaN(effectiveDiscountedPrice) || effectiveDiscountedPrice < 0) {
      showToast('Ingresa un precio con descuento válido', 'error')
      return
    }

    if (effectiveDiscountedPrice > parsedPrice) {
      showToast('El nuevo precio no puede ser mayor al precio original', 'error')
      return
    }

    if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      showToast('Ingresa una cantidad válida', 'error')
      return
    }

    if (Number.isNaN(calculatedDiscountPercent) || calculatedDiscountPercent < 0 || calculatedDiscountPercent > 100) {
      showToast('Ingresa un descuento válido entre 0 y 100', 'error')
      return
    }

    addLineItem(selectedProduct.id, selectedProduct.name, selectedProduct.sku, parsedPrice, parsedQuantity, calculatedDiscountPercent)

    setSelectedProductId('')
    setUnitPrice('')
    setDiscountedUnitPrice('')
    setQuantity('1')
    setLineDiscountPercent('0')
    setSearchTerm('')
    setIsProductSuggestionsOpen(false)
  }

  const handleBarcodeAdd = (code: string) => {
    const barcode = code.trim().toLowerCase()
    if (!barcode) return

    const found = state.products.find((p) => p.sku.toLowerCase() === barcode || (p.barcode ?? '').toLowerCase() === barcode)
    if (!found) {
      showToast('Producto no encontrado', 'error')
      return
    }

    addLineItem(found.id, found.name, found.sku, found.price, 1, 0)
    playScanSuccessTone()
    showToast(`Agregado: ${found.name}`, 'success')
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

  const commitScannerBuffer = () => {
    const capturedValue = scannerBufferRef.current.trim()
    scannerBufferRef.current = ''
    if (!capturedValue) return
    handleBarcodeAdd(capturedValue)
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
      customerEmail: customer?.email || '',
      cashierName: order.cashierName || user?.name || 'Cajero no disponible',
      companyName: companySettings.companyName,
      companyAddress: companySettings.address,
      companyEmail: companySettings.email,
      companyPhone: companySettings.phone,
      companyCountry: companySettings.country,
      invoiceDate: new Date().toLocaleDateString('es-ES'),
    }

    if (order.documentType === 'invoice') {
      printDocument(generateInvoiceHTML(invoiceData))
    } else {
      printPlainTextReceipt(invoiceData)
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return

      if (event.altKey && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        handleAddProduct()
        return
      }

      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault()
        const form = document.getElementById('pos-sale-form') as HTMLFormElement | null
        form?.requestSubmit()
        return
      }

      // Si el foco está en un campo de texto (búsqueda, precio, etc.), no interceptar
      const target = event.target as HTMLElement
      const isInTextField = (target instanceof HTMLInputElement && target.type !== 'hidden') || target instanceof HTMLTextAreaElement
      if (isInTextField) return

      if (event.key === 'Enter') {
        event.preventDefault()
        commitScannerBuffer()
        return
      }

      if (event.key.length !== 1) return
      if (event.ctrlKey || event.metaKey || event.altKey) return

      scannerBufferRef.current += event.key

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
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (lineItems.length === 0) {
      showToast('Agrega al menos un producto a la venta', 'error')
      return
    }

    const received = roundMoney(parseFloat(amountReceived))
    if (paymentMethod === 'cash') {
      if (Number.isNaN(received) || received <= 0) {
        showToast('Ingresa el monto recibido en efectivo', 'error')
        return
      }

      if (roundMoney(received - total) < 0) {
        showToast('El monto recibido no cubre el total a pagar con descuento', 'error')
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
      customerName: state.customers.find(c => c.id === customerId)?.name || 'Consumidor Final',
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

    showToast('Venta creada exitosamente', 'success')
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
                <label className="block text-sm font-semibold mb-2">Cliente <span className="font-normal text-muted-foreground">(opcional)</span></label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerSearchTerm}
                    onChange={(e) => {
                      setCustomerSearchTerm(e.target.value)
                      setCustomerId('')
                      setDiscountedUnitPrice(unitPrice)
                      setLineDiscountPercent('0')
                      setIsCustomerSuggestionsOpen(true)
                    }}
                    onFocus={() => setIsCustomerSuggestionsOpen(true)}
                    className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                    placeholder="Buscar cliente... (vacío = Consumidor Final)"
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
                          setDiscountedUnitPrice('')
                          setLineDiscountPercent('0')
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

                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Precio original</label>
                    <input
                      type="number"
                      step="0.01"
                      value={unitPrice}
                      readOnly
                      className="w-full px-3 py-2.5 border border-border rounded-xl bg-muted/40 text-muted-foreground focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">Nuevo precio manual</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discountedUnitPrice}
                      onChange={(e) => handleDiscountedUnitPriceChange(sanitizeDecimalInput(e.target.value))}
                      disabled={!isWholesaleCustomer}
                      className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted/40 disabled:text-muted-foreground disabled:cursor-not-allowed"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(sanitizeIntegerInput(e.target.value))}
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
                      onChange={(e) => handleDiscountPercentChange(sanitizeDecimalInput(e.target.value))}
                      disabled={!isWholesaleCustomer}
                      className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted/40 disabled:text-muted-foreground disabled:cursor-not-allowed"
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

                <div className={`rounded-xl border px-3 py-2 text-sm ${isManualPriceAboveOriginal ? 'border-destructive/40 bg-destructive/5 text-destructive' : 'border-border/70 bg-background/80 text-muted-foreground'}`}>
                  {!customerId ? (
                    <p>Selecciona un cliente para definir si aplica descuento mayorista.</p>
                  ) : !isWholesaleCustomer ? (
                    <p>Cliente minorista: no se aplica descuento manual.</p>
                  ) : isManualPriceAboveOriginal ? (
                    <p>El nuevo precio no puede ser mayor al precio original del producto.</p>
                  ) : (
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span>Descuento aplicado: <span className="font-semibold text-secondary">{formatCurrency(currentLineDiscountAmount)}</span></span>
                      <span>Porcentaje: <span className="font-semibold text-secondary">{currentLineDiscountPercent.toFixed(2)}%</span></span>
                    </div>
                  )}
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
                            {line.discountAmount > 0 ? <span className="block text-xs text-muted-foreground">Descuento: -{formatCurrency(line.discountAmount)} ({line.discountPercent.toFixed(2)}%)</span> : null}
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
                      onChange={(e) => setAmountReceived(sanitizeDecimalInput(e.target.value))}
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
