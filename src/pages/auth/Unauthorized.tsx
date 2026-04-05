import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-6">
          <div className="text-6xl font-bold text-destructive mb-2">403</div>
          <h1 className="text-3xl font-bold text-foreground">Acceso Denegado</h1>
        </div>
        <p className="text-muted-foreground mb-8 max-w-md">
          No tienes permiso para acceder a este módulo con tu rol actual.
        </p>
        <Link
          to="/dashboard"
          className="inline-block px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition"
        >
          Volver al Dashboard
        </Link>
      </div>
    </div>
  );
}
