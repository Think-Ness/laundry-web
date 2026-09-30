export type OrderStatus =
  | 'waiting_confirmation'
  | 'new'
  | 'received'
  | 'processing'
  | 'ready'
  | 'completed'
  | 'cancelled'

export interface Order {
  id: string
  transaction_id: string
  intake_token_hash: string
  customer_name: string
  student_name: string
  student_reg_number?: string | null
  service_type?: string | null
  customer_phone: string | null
  weight: number
  unit_price: number
  total_amount: number
  payment_method: 'cash' | 'qris'
  payment_status: string
  customer_note: string | null
  status: OrderStatus
  submitted_at: string | null
  received_at: string | null
  processing_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface OrderEvent {
  id: string
  order_id: string
  event_type: string
  actor_id: string | null
  description: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface Profile {
  id: string
  name: string
  email: string
  role: 'staff' | 'supervisor' | 'admin'
  is_active: boolean
}

export type PaymentMethod = 'cash' | 'qris'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  waiting_confirmation: 'Menunggu Konfirmasi',
  new: 'Pesanan Baru',
  received: 'Diterima',
  processing: 'Diproses',
  ready: 'Siap',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  waiting_confirmation: 'gray',
  new: 'blue',
  received: 'indigo',
  processing: 'orange',
  ready: 'green',
  completed: 'green',
  cancelled: 'red',
}

// Valid status transitions (from → to[])
export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  waiting_confirmation: ['new'],
  new: ['received', 'cancelled'],
  received: ['processing', 'cancelled'],
  processing: ['ready'],
  ready: ['completed'],
  completed: [],
  cancelled: [],
}
