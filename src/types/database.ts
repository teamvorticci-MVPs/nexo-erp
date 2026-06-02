// Auto-alineado con supabase/migrations/001_initial_schema.sql
// Actualizar si cambia el esquema de base de datos

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'vendedor'
export type MovementType = 'entrada' | 'salida' | 'ajuste'
export type CashMovementType = 'apertura' | 'ingreso' | 'egreso' | 'cierre'
export type SaleStatus = 'pendiente' | 'completada' | 'anulada'
export type PaymentMethod = 'efectivo' | 'debito' | 'credito' | 'transferencia' | 'otro'
export type StockAlertLevel = 'bajo' | 'critico' | 'agotado'
export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE'

// ─── Row types (resultado de SELECT) ─────────────────────────────────────────

export interface Tenant {
  id: string
  name: string
  slug: string
  email: string
  phone: string | null
  address: string | null
  logo_url: string | null
  settings: Json
  active: boolean
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  tenant_id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  tenant_id: string
  full_name: string
  email: string | null
  phone: string | null
  rut: string | null
  address: string | null
  notes: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  tenant_id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  rut: string | null
  address: string | null
  notes: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  tenant_id: string
  supplier_id: string | null
  sku: string | null
  name: string
  description: string | null
  brand: string | null
  category: string | null
  unit: string
  cost_price: number
  sale_price: number
  /** Columna generada: ((sale_price - cost_price) / cost_price) * 100 */
  margin_pct: number
  /** Columna generada: sale_price - cost_price */
  profit_per_unit: number
  stock_quantity: number
  stock_min: number
  stock_max: number | null
  image_url: string | null
  barcode: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface InventoryMovement {
  id: string
  tenant_id: string
  product_id: string
  user_id: string
  supplier_id: string | null
  type: MovementType
  quantity: number
  cost_price: number | null
  stock_before: number
  stock_after: number
  reference: string | null
  notes: string | null
  created_at: string
}

export interface CashRegister {
  id: string
  tenant_id: string
  user_id: string
  opened_at: string
  closed_at: string | null
  opening_balance: number
  closing_balance: number | null
  expected_balance: number | null
  /** Columna generada: closing_balance - expected_balance */
  difference: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CashMovement {
  id: string
  tenant_id: string
  cash_register_id: string
  user_id: string
  type: CashMovementType
  amount: number
  description: string | null
  created_at: string
}

export interface Sale {
  id: string
  tenant_id: string
  user_id: string
  customer_id: string | null
  cash_register_id: string | null
  status: SaleStatus
  payment_method: PaymentMethod
  subtotal: number
  discount_amount: number
  tax_amount: number
  total: number
  total_cost: number
  /** Columna generada: total - total_cost - discount_amount */
  total_profit: number
  /** Columna generada: ((total - total_cost - discount_amount) / total_cost) * 100 */
  margin_pct: number
  notes: string | null
  voided_at: string | null
  voided_by: string | null
  void_reason: string | null
  created_at: string
  updated_at: string
}

export interface SaleItem {
  id: string
  tenant_id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  unit_cost: number
  discount_pct: number
  /** Columna generada: quantity * unit_price * (1 - discount_pct / 100) */
  line_total: number
  /** Columna generada: quantity * unit_cost */
  line_cost: number
  /** Columna generada: line_total - line_cost */
  line_profit: number
  created_at: string
}

export interface StockAlert {
  id: string
  tenant_id: string
  product_id: string
  level: StockAlertLevel
  stock_current: number
  stock_min: number
  resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  tenant_id: string
  user_id: string | null
  table_name: string
  record_id: string
  action: AuditAction
  old_data: Json | null
  new_data: Json | null
  ip_address: string | null
  created_at: string
}

// ─── Insert types (columnas generadas y defaults excluidos de obligatorio) ────

export type TenantInsert = Omit<Tenant, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  active?: boolean
  settings?: Json
}

export type UserInsert = Omit<User, 'created_at' | 'updated_at'> & {
  role?: UserRole
  active?: boolean
}

export type CustomerInsert = Omit<Customer, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  active?: boolean
}

export type SupplierInsert = Omit<Supplier, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  active?: boolean
}

export type ProductInsert = {
  tenant_id: string
  name: string
  id?: string
  supplier_id?: string | null
  sku?: string | null
  description?: string | null
  brand?: string | null
  category?: string | null
  unit?: string
  cost_price?: number
  sale_price?: number
  stock_quantity?: number
  stock_min?: number
  stock_max?: number | null
  image_url?: string | null
  barcode?: string | null
  active?: boolean
}

export type InventoryMovementInsert = Omit<
  InventoryMovement,
  'id' | 'created_at' | 'stock_before' | 'stock_after'
> & {
  id?: string
  /** Rellenados automáticamente por trigger apply_inventory_movement */
  stock_before?: number
  stock_after?: number
}

export type CashRegisterInsert = Omit<
  CashRegister,
  'id' | 'created_at' | 'updated_at' | 'difference'
> & {
  id?: string
  opening_balance?: number
  opened_at?: string
}

export type CashMovementInsert = Omit<CashMovement, 'id' | 'created_at'> & {
  id?: string
}

export type SaleInsert = Omit<
  Sale,
  'id' | 'created_at' | 'updated_at' | 'total_profit' | 'margin_pct'
> & {
  id?: string
  status?: SaleStatus
  payment_method?: PaymentMethod
  subtotal?: number
  discount_amount?: number
  tax_amount?: number
  total?: number
  total_cost?: number
}

export type SaleItemInsert = Omit<
  SaleItem,
  'id' | 'created_at' | 'line_total' | 'line_cost' | 'line_profit'
> & {
  id?: string
  unit_cost?: number
  discount_pct?: number
}

export type StockAlertInsert = Omit<StockAlert, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  resolved?: boolean
}

// audit_logs solo se escribe vía trigger (SECURITY DEFINER), no desde el cliente

// ─── Update types (todos opcionales) ─────────────────────────────────────────

export type TenantUpdate = Partial<Omit<Tenant, 'id' | 'created_at' | 'updated_at'>>
export type UserUpdate = Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>
export type CustomerUpdate = Partial<Omit<Customer, 'id' | 'created_at' | 'updated_at'>>
export type SupplierUpdate = Partial<Omit<Supplier, 'id' | 'created_at' | 'updated_at'>>
export type ProductUpdate = Partial<
  Omit<Product, 'id' | 'created_at' | 'updated_at' | 'margin_pct' | 'profit_per_unit'>
>
export type CashRegisterUpdate = Partial<
  Omit<CashRegister, 'id' | 'created_at' | 'updated_at' | 'difference'>
>
export type CashMovementUpdate = Partial<Omit<CashMovement, 'id' | 'created_at'>>
export type SaleUpdate = Partial<
  Omit<Sale, 'id' | 'created_at' | 'updated_at' | 'total_profit' | 'margin_pct'>
>
export type SaleItemUpdate = Partial<
  Omit<SaleItem, 'id' | 'created_at' | 'line_total' | 'line_cost' | 'line_profit'>
>
export type StockAlertUpdate = Partial<Omit<StockAlert, 'id' | 'created_at' | 'updated_at'>>

// ─── Database schema (usado por el cliente Supabase genérico) ─────────────────
// @supabase/supabase-js v2.100+ requiere Views, CompositeTypes y Relationships
// para que la inferencia de genéricos funcione correctamente.

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: Tenant
        Insert: TenantInsert
        Update: TenantUpdate
        Relationships: []
      }
      users: {
        Row: User
        Insert: UserInsert
        Update: UserUpdate
        Relationships: []
      }
      customers: {
        Row: Customer
        Insert: CustomerInsert
        Update: CustomerUpdate
        Relationships: []
      }
      suppliers: {
        Row: Supplier
        Insert: SupplierInsert
        Update: SupplierUpdate
        Relationships: []
      }
      products: {
        Row: Product
        Insert: ProductInsert
        Update: ProductUpdate
        Relationships: []
      }
      inventory_movements: {
        Row: InventoryMovement
        Insert: InventoryMovementInsert
        Update: Record<string, never>
        Relationships: []
      }
      cash_registers: {
        Row: CashRegister
        Insert: CashRegisterInsert
        Update: CashRegisterUpdate
        Relationships: []
      }
      cash_movements: {
        Row: CashMovement
        Insert: CashMovementInsert
        Update: CashMovementUpdate
        Relationships: []
      }
      sales: {
        Row: Sale
        Insert: SaleInsert
        Update: SaleUpdate
        Relationships: []
      }
      sale_items: {
        Row: SaleItem
        Insert: SaleItemInsert
        Update: SaleItemUpdate
        Relationships: []
      }
      stock_alerts: {
        Row: StockAlert
        Insert: StockAlertInsert
        Update: StockAlertUpdate
        Relationships: []
      }
      audit_logs: {
        Row: AuditLog
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Enums: {
      user_role: UserRole
      movement_type: MovementType
      cash_movement_type: CashMovementType
      sale_status: SaleStatus
      payment_method: PaymentMethod
      stock_alert_level: StockAlertLevel
      audit_action: AuditAction
    }
    Functions: {
      auth_tenant_id: {
        Args: Record<string, never>
        Returns: string
      }
    }
    CompositeTypes: Record<string, never>
  }
}

// ─── Superadmin ───────────────────────────────────────────────────────────────

export interface Superadmin {
  id: string
  email: string
  created_at: string
}

// ─── Utilidades de tipo ───────────────────────────────────────────────────────

/** Extrae el tipo Row de una tabla. Ejemplo: Tables<'products'> */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

/** Extrae el tipo Insert de una tabla. Ejemplo: TablesInsert<'sales'> */
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

/** Extrae el tipo Update de una tabla. Ejemplo: TablesUpdate<'products'> */
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

/** Extrae un enum. Ejemplo: Enums<'user_role'> */
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

// ─── Tipos de join más comunes ────────────────────────────────────────────────

export type ProductWithSupplier = Product & {
  suppliers: Pick<Supplier, 'id' | 'name'> | null
}

export type SaleWithItems = Sale & {
  sale_items: (SaleItem & { products: Pick<Product, 'id' | 'name' | 'unit'> })[]
  customers: Pick<Customer, 'id' | 'full_name'> | null
}

export type SaleItemWithProduct = SaleItem & {
  products: Pick<Product, 'id' | 'name' | 'sku' | 'unit' | 'image_url'>
}

export type StockAlertWithProduct = StockAlert & {
  products: Pick<Product, 'id' | 'name' | 'sku' | 'category' | 'image_url'>
}

export type InventoryMovementWithDetails = InventoryMovement & {
  products: Pick<Product, 'id' | 'name' | 'sku'>
  users: Pick<User, 'id' | 'full_name'>
  suppliers: Pick<Supplier, 'id' | 'name'> | null
}
