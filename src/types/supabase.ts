
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
          created_at: string
          id: string
          items: Json
          name: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          name: string
          status?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          name?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          adjustmentId: string | null
          amount: number
          description: string
          id: string
          saleId: string | null
          source: string
          timestamp: string
          type: string
          user_id: string
        }
        Insert: {
          adjustmentId?: string | null
          amount: number
          description: string
          id?: string
          saleId?: string | null
          source: string
          timestamp?: string
          type: string
          user_id?: string
        }
        Update: {
          adjustmentId?: string | null
          amount?: number
          description?: string
          id?: string
          saleId?: string | null
          source?: string
          timestamp?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          iconName: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          iconName: string
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          iconName?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          categoryId: string
          comboItems: number | null
          id: string
          isCombo: boolean | null
          name: string
          price: number
          stock: number | null
          user_id: string
        }
        Insert: {
          categoryId: string
          comboItems?: number | null
          id?: string
          isCombo?: boolean | null
          name: string
          price: number
          stock?: number | null
          user_id?: string
        }
        Update: {
          categoryId?: string
          comboItems?: number | null
          id?: string
          isCombo?: boolean | null
          name?: string
          price?: number
          stock?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_categoryId_fkey"
            columns: ["categoryId"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cashTendered: number | null
          changeGiven: number | null
          discountAmount: number
          id: string
          items: Json
          leaveChangeAsCredit: boolean | null
          originalAmount: number
          payments: Json
          status: string
          timestamp: string
          totalAmount: number
          user_id: string
        }
        Insert: {
          cashTendered?: number | null
          changeGiven?: number | null
          discountAmount?: number
          id?: string
          items: Json
          leaveChangeAsCredit?: boolean | null
          originalAmount: number
          payments: Json
          status: string
          timestamp?: string
          totalAmount: number
          user_id?: string
        }
        Update: {
          cashTendered?: number | null
          changeGiven?: number | null
          discountAmount?: number
          id?: string
          items?: Json
          leaveChangeAsCredit?: boolean | null
          originalAmount?: number
          payments?: Json
          status?: string
          timestamp?: string
          totalAmount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
