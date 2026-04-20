// Confirmación de eliminación con botones personalizados (puedes cambiar las clases por Tailwind si lo prefieres)

export function showDeleteConfirm(
  title = "¿Estás seguro?",
  text = "¡Esta acción no se puede deshacer!",
  confirmButtonText = "Sí, eliminar",
  cancelButtonText = "No, cancelar"
) {
  return Swal.mixin({
    customClass: {
      confirmButton: "bg-green-600 text-white px-4 py-2 rounded ml-3 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 transition",
      cancelButton: "bg-red-600 text-white px-4 py-2 rounded mr-3 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 transition"
    },
    buttonsStyling: false
  }).fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true
  });
}
import Swal, { SweetAlertIcon, SweetAlertOptions } from 'sweetalert2';

export function showAlert(
  title: string,
  text: string = '',
  icon: SweetAlertIcon = 'info',
  options: SweetAlertOptions = {}
) {
  return Swal.fire({
    title,
    text,
    icon,
    ...options,
  });
}

export function showConfirm(
  title: string,
  text: string = '',
  confirmButtonText: string = 'Sí',
  cancelButtonText: string = 'No',
  options: SweetAlertOptions = {}
) {
  return Swal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    ...options,
  });
}

export function showToast(
  title: string,
  icon: SweetAlertIcon = 'success',
  options: SweetAlertOptions = {}
) {
  return Swal.fire({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    title,
    icon,
    ...options,
  });
}
