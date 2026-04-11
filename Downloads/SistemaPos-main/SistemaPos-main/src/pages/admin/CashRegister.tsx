import React, { useState, useMemo } from 'react';
import { Plus, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useAuth } from '../../context/AuthContext';
import { calculateSessionTotals } from '../../lib/data/cash-register';
import { apiRequest } from '../../lib/api';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { toast } from 'sonner';

export default function CashRegister() {
  const { state, dispatch } = useAdmin();
  const { user } = useAuth();
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [movementForm, setMovementForm] = useState({
    type: 'gasto' as 'entrada' | 'salida' | 'gasto' | 'ingreso',
    amount: '',
    reason: '',
  });
  const [closeForm, setCloseForm] = useState({
    actualCash: '',
    notes: '',
  });

  const activeSession = useMemo(
    () => state.cashSessions.find((s) => s.status === 'open'),
    [state.cashSessions]
  );

  const sessionTotals = useMemo(() => {
    if (!activeSession) return null;
    return calculateSessionTotals(activeSession);
  }, [activeSession]);

  const handleOpenSession = async () => {
    if (!openingAmount || parseFloat(openingAmount) < 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    if (!user?.id) {
      toast.error('Usuario no identificado');
      return;
    }

    try {
      const data = await apiRequest<Record<string, unknown>>('/cash/sessions', {
        method: 'POST',
        body: {
          userId: Number(user.id),
          openingAmount: parseFloat(openingAmount),
        },
      });

      dispatch({
        type: 'SET_CASH_SESSIONS',
        payload: [
          {
            id: String(data.id),
            sessionNumber: String(data.session_number ?? ''),
            openedBy: String(data.opened_by ?? user.id),
            openingAmount: Number(data.opening_amount ?? 0),
            openedAt: data.opened_at ? new Date(String(data.opened_at)) : new Date(),
            movements: [],
            status: 'open',
          },
          ...state.cashSessions,
        ],
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo abrir la caja');
      return;
    }

    toast.success('Caja abierta exitosamente');
    setOpeningAmount('');
    setIsOpenDialogOpen(false);
  };

  const handleAddMovement = async () => {
    if (!activeSession) {
      toast.error('No hay caja abierta');
      return;
    }
    if (!movementForm.amount || parseFloat(movementForm.amount) <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    if (!movementForm.reason.trim()) {
      toast.error('Ingresa un motivo');
      return;
    }

    try {
      await apiRequest('/cash/movements', {
        method: 'POST',
        body: {
          sessionId: Number(activeSession.id),
          movementType: movementForm.type,
          amount: parseFloat(movementForm.amount),
          reason: movementForm.reason,
          reference: movementForm.reason,
          userId: user?.id ? Number(user.id) : null,
        },
      });

      dispatch({
        type: 'ADD_CASH_MOVEMENT',
        payload: {
          sessionId: activeSession.id,
          movementType: movementForm.type,
          amount: parseFloat(movementForm.amount),
          reason: movementForm.reason,
          reference: movementForm.reason,
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar el movimiento');
      return;
    }

    toast.success('Movimiento registrado');
    setMovementForm({ type: 'gasto', amount: '', reason: '' });
    setIsMovementDialogOpen(false);
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    if (!closeForm.actualCash || parseFloat(closeForm.actualCash) < 0) {
      toast.error('Ingresa la cantidad de dinero en caja');
      return;
    }
    if (!user?.id) {
      toast.error('Usuario no identificado');
      return;
    }

    try {
      const data = await apiRequest<Record<string, unknown>>(`/cash/sessions/${activeSession.id}/close`, {
        method: 'POST',
        body: {
          userId: Number(user.id),
          actualCash: parseFloat(closeForm.actualCash),
          notes: closeForm.notes,
        },
      });

      dispatch({
        type: 'CLOSE_CASH_SESSION',
        payload: {
          sessionId: activeSession.id,
          userId: user.id,
          actualCash: Number(data.counted_amount ?? closeForm.actualCash),
          notes: closeForm.notes,
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cerrar la caja');
      return;
    }

    toast.success('Caja cerrada');
    setCloseForm({ actualCash: '', notes: '' });
    setIsCloseDialogOpen(false);
  };

  const recentSessions = [...state.cashSessions].slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-8 w-8 text-green-600" />
          <h1 className="text-3xl font-bold">Caja</h1>
        </div>
        {activeSession ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsMovementDialogOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Movimiento
            </Button>
            <Button
              variant="destructive"
              onClick={() => setIsCloseDialogOpen(true)}
            >
              Cerrar Caja
            </Button>
          </div>
        ) : (
          <Button
            variant="default"
            onClick={() => setIsOpenDialogOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Abrir Caja
          </Button>
        )}
      </div>

      {/* Status Cards */}
      {activeSession && sessionTotals && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Dinero Inicial
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${activeSession.openingAmount.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">
                Abierto: {activeSession.openedAt.toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Vendido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${sessionTotals.totalSales.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">
                {activeSession.movements.filter((m) => m.type === 'entrada').length} transacciones
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Gastos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">${sessionTotals.totalExpenses.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">
                {activeSession.movements.filter((m) => m.type === 'gasto').length} registros
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Esperado en Caja
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">${sessionTotals.expectedCash.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">Apertura + Ventas - Gastos</p>
            </CardContent>
          </Card>
        </div>
      )}

      {!activeSession && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <AlertCircle className="h-5 w-5" />
              <p>No hay caja abierta. Abre una para comenzar el día.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Movements Table */}
      {activeSession && (
        <Card>
          <CardHeader>
            <CardTitle>Movimientos del Día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-2 px-4 font-semibold">Hora</th>
                    <th className="text-left py-2 px-4 font-semibold">Tipo</th>
                    <th className="text-left py-2 px-4 font-semibold">Motivo</th>
                    <th className="text-right py-2 px-4 font-semibold">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSession.movements.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-gray-500">
                        Sin movimientos
                      </td>
                    </tr>
                  ) : (
                    activeSession.movements.map((mov) => (
                      <tr
                        key={mov.id}
                        className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="py-3 px-4">
                          {mov.timestamp.toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              mov.type === 'entrada'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                : mov.type === 'salida'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {mov.type === 'entrada'
                              ? 'Venta'
                              : mov.type === 'salida'
                              ? 'Devolución'
                              : mov.type === 'gasto'
                              ? 'Gasto'
                              : 'Ingreso'}
                          </span>
                        </td>
                        <td className="py-3 px-4">{mov.reason}</td>
                        <td
                          className={`py-3 px-4 text-right font-semibold ${
                            mov.type === 'entrada' || mov.type === 'ingreso'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {mov.type === 'entrada' || mov.type === 'ingreso' ? '+' : '-'}${mov.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Cajas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-2 px-4 font-semibold">Sesión</th>
                  <th className="text-left py-2 px-4 font-semibold">Apertura</th>
                  <th className="text-left py-2 px-4 font-semibold">Estado</th>
                  <th className="text-right py-2 px-4 font-semibold">Inicial</th>
                  <th className="text-right py-2 px-4 font-semibold">Ventas</th>
                  <th className="text-right py-2 px-4 font-semibold">Gastos</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-gray-500">
                      Sin historial
                    </td>
                  </tr>
                ) : (
                  recentSessions.map((session) => {
                    const totals = calculateSessionTotals(session);
                    return (
                      <tr
                        key={session.id}
                        className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="py-3 px-4 font-medium">{session.sessionNumber}</td>
                        <td className="py-3 px-4">
                          {session.openedAt.toLocaleDateString()} {session.openedAt.toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              session.status === 'open'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {session.status === 'open' ? 'Abierta' : 'Cerrada'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">${session.openingAmount.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-green-600">+${totals.totalSales.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-red-600">-${totals.totalExpenses.toFixed(2)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Dialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Caja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="opening-amount">Dinero Inicial en Caja</Label>
              <Input
                id="opening-amount"
                type="number"
                placeholder="0.00"
                value={openingAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOpeningAmount(e.target.value)}
                step="0.01"
                min="0"
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsOpenDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleOpenSession}>Abrir</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Movimiento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="movement-type">Tipo</Label>
              <select
                id="movement-type"
                value={movementForm.type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setMovementForm({
                    ...movementForm,
                    type: e.target.value as 'entrada' | 'salida' | 'gasto' | 'ingreso',
                  })
                }
                className="w-full mt-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
              >
                <option value="gasto">Gasto</option>
                <option value="ingreso">Ingreso Adicional</option>
                <option value="salida">Devolución</option>
              </select>
            </div>
            <div>
              <Label htmlFor="movement-amount">Monto</Label>
              <Input
                id="movement-amount"
                type="number"
                placeholder="0.00"
                value={movementForm.amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setMovementForm({ ...movementForm, amount: e.target.value })
                }
                step="0.01"
                min="0"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="movement-reason">Motivo</Label>
              <Input
                id="movement-reason"
                type="text"
                placeholder="Descripción del movimiento"
                value={movementForm.reason}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setMovementForm({ ...movementForm, reason: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsMovementDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddMovement}>Registrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar Caja</DialogTitle>
          </DialogHeader>
          {activeSession && sessionTotals && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Dinero Inicial:</span>
                  <span className="font-semibold">${activeSession.openingAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Total Vendido:</span>
                  <span className="font-semibold">+${sessionTotals.totalSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Gastos:</span>
                  <span className="font-semibold">-${sessionTotals.totalExpenses.toFixed(2)}</span>
                </div>
                <div className="border-t dark:border-gray-700 pt-2 flex justify-between font-bold text-base">
                  <span>Esperado en Caja:</span>
                  <span>${sessionTotals.expectedCash.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="actual-cash">Dinero Real en Caja</Label>
                <Input
                  id="actual-cash"
                  type="number"
                  placeholder="0.00"
                  value={closeForm.actualCash}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCloseForm({ ...closeForm, actualCash: e.target.value })}
                  step="0.01"
                  min="0"
                  className="mt-1"
                />
                {closeForm.actualCash && sessionTotals && (
                  <p
                    className={`text-xs mt-2 ${
                      parseFloat(closeForm.actualCash) === sessionTotals.expectedCash
                        ? 'text-green-600'
                        : 'text-orange-600'
                    }`}
                  >
                    Diferencia:{' '}
                    <span className="font-semibold">
                      {parseFloat(closeForm.actualCash) > sessionTotals.expectedCash ? '+' : ''}
                      ${(parseFloat(closeForm.actualCash) - sessionTotals.expectedCash).toFixed(2)}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="close-notes">Notas (Opcional)</Label>
                <Input
                  id="close-notes"
                  type="text"
                  placeholder="Observaciones del cierre"
                  value={closeForm.notes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCloseForm({ ...closeForm, notes: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsCloseDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleCloseSession}>
                  Cerrar Caja
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
