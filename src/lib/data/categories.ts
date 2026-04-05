export interface Category {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
}

export const categories: Category[] = [
  {
    id: 'CAT-001',
    name: 'Bebidas',
    description: 'Productos de consumo liquido y bebidas preparadas.',
    status: 'active',
    createdAt: new Date('2024-01-10'),
  },
  {
    id: 'CAT-002',
    name: 'Snacks',
    description: 'Botanas, aperitivos y productos de consumo rapido.',
    status: 'active',
    createdAt: new Date('2024-01-12'),
  },
  {
    id: 'CAT-003',
    name: 'Limpieza',
    description: 'Productos para limpieza del hogar y negocio.',
    status: 'active',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'CAT-004',
    name: 'Lacteos',
    description: 'Leche, quesos, yogures y derivados lacteos.',
    status: 'active',
    createdAt: new Date('2024-01-18'),
  },
];
