// services/products.ts
export async function fetchProductByBarcode(barcode: string) {
  const res = await fetch(`/api/products/barcode/${barcode}`);
  if (!res.ok) throw new Error("Producto no encontrado");
  return res.json(); // { nombre, precio, stock, ... }
}
