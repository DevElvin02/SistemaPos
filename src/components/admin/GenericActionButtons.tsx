interface GenericActionButtonsProps {
  onEdit: () => void
  onDelete: () => void
  disabled?: boolean
}

export function GenericActionButtons({ onEdit, onDelete, disabled = false }: GenericActionButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onEdit}
        disabled={disabled}
        className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
        title="Editar"
      >
        Editar
      </button>

      <button
        onClick={onDelete}
        disabled={disabled}
        className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
        title="Eliminar"
      >
        Eliminar
      </button>
    </div>
  )
}
