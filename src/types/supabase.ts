
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      active_orders: {
        Row: {
          id: string
          name: string
          items: Json
          created_at: string
          status: string | null
        }
        Insert: {
          id: string
          name: string
          items: Json
          created_at?: string
          status?: string | null
        }
        Update: {
          id?: string
          name?: string
          items?: Json
          created_at?: string
          status?: string | null
        }
        Relationships: []
      }
      balances: {
        Row: {
          id: string
          balance: number
        }
        Insert: {
          id: string
          balance?: number
        }
        Update: {
          id?: string
          balance?: number
        }
        Relationships: []
      }
      financial_entries: {
        Row: {
          id: string
          description: string
          amount: number
          type: "expense" | "income"
          source: "daily_cash" | "secondary_cash" | "bank_account"
          timestamp: string
          saleId: string | null
          adjustmentId: string | null
        }
        Insert: {
          id: string
          description: string
          amount: number
          type: "expense" | "income"
          source: "daily_cash" | "secondary_cash" | "bank_account"
          timestamp: string
          saleId?: string | null
          adjustmentId?: string | null
        }
        Update: {
          id?: string
          description?: string
          amount?: number
          type?: "expense" | "income"
          source?: "daily_cash" | "secondary_cash" | "bank_account"
          timestamp?: string
          saleId?: string | null
          adjustmentId?: string | null
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          id: string
          name: string
          iconName: string
        }
        Insert: {
          id: string
          name: string
          iconName: string
        }
        Update: {
          id?: string
          name?: string
          iconName?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          name: string
          price: number
          categoryId: string
          stock: number | null
          is_combo: boolean | null
          combo_items: number | null
        }
        Insert: {
          id: string
          name: string
          price: number
          categoryId: string
          stock?: number | null
          is_combo?: boolean | null
          combo_items?: number | null
        }
        Update: {
          id?: string
          name?: string
          price?: number
          categoryId?: string
          stock?: number | null
          is_combo?: boolean | null
          combo_items?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_categoryId_fkey"
            columns: ["categoryId"]
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          }
        ]
      }
      sales: {
        Row: {
          id: string
          items: Json
          total_amount: number
          original_amount: number
          discount_amount: number
          payments: Json
          cash_tendered: number | null
          change_given: number | null
          timestamp: string
          status: string
          leave_change_as_credit: boolean | null
        }
        Insert: {
          id: string
          items: Json
          total_amount: number
          original_amount: number
          discount_amount: number
          payments: Json
          cash_tendered?: number | null
          change_given?: number | null
          timestamp: string
          status: string
          leave_change_as_credit?: boolean | null
        }
        Update: {
          id?: string
          items?: Json
          total_amount?: number
          original_amount?: number
          discount_amount?: number
          payments?: Json
          cash_tendered?: number | null
          change_given?: number | null
          timestamp?: string
          status?: string
          leave_change_as_credit?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
