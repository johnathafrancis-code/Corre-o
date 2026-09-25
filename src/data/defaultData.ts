import { Category, PartnerConfig, Transaction } from '../types/finance';
import husbandAvatar from '../assets/images/avatar_husband_1790170463739.jpg';
import wifeAvatar from '../assets/images/avatar_wife_1790170478072.jpg';

export const DEFAULT_PARTNERS: PartnerConfig = {
  partner1Name: 'Johnatha',
  partner2Name: 'Raisa',
  partner1Avatar: husbandAvatar,
  partner2Avatar: wifeAvatar,
  splitRatio: 0.5, // 50% cada em gastos compartilhados
};

export const DEFAULT_CATEGORIES: Category[] = [
  // Despesas
  { id: 'moradia', name: 'Moradia & Aluguel', icon: 'Home', color: '#38bdf8', type: 'expense' },
  { id: 'supermercado', name: 'Supermercado & Feira', icon: 'ShoppingCart', color: '#4ade80', type: 'expense' },
  { id: 'restaurante', name: 'Restaurante & Delivery', icon: 'Utensils', color: '#fb923c', type: 'expense' },
  { id: 'utilidades', name: 'Contas (Luz, Água, Net)', icon: 'Zap', color: '#facc15', type: 'expense' },
  { id: 'transporte', name: 'Transporte & Carro', icon: 'Car', color: '#a78bfa', type: 'expense' },
  { id: 'saude', name: 'Saúde & Farmácia', icon: 'HeartPulse', color: '#f87171', type: 'expense' },
  { id: 'lazer', name: 'Lazer & Viagens', icon: 'Plane', color: '#2dd4bf', type: 'expense' },
  { id: 'pessoal', name: 'Cuidados Pessoais', icon: 'Smile', color: '#f472b6', type: 'expense' },
  { id: 'educacao', name: 'Educação & Livros', icon: 'BookOpen', color: '#818cf8', type: 'expense' },
  { id: 'outros_gastos', name: 'Outras Despesas', icon: 'MoreHorizontal', color: '#94a3b8', type: 'expense' },

  // Receitas
  { id: 'salario', name: 'Salário Principal', icon: 'Briefcase', color: '#34d399', type: 'income' },
  { id: 'extra', name: 'Renda Extra & Freelance', icon: 'Sparkles', color: '#60a5fa', type: 'income' },
  { id: 'investimentos', name: 'Rendimentos & Dividendos', icon: 'TrendingUp', color: '#c084fc', type: 'income' },
  { id: 'outros_recebimentos', name: 'Outras Entradas', icon: 'PlusCircle', color: '#a3e635', type: 'income' },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'Pix',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  dinheiro: 'Dinheiro',
  transferencia: 'Transferência',
  boleto: 'Boleto Bancário',
};
