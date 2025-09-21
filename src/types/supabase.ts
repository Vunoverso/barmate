

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
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          name: string
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          name?: string
          status?: string | null
        }
        Relationships: []
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
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          iconName: string
          id: string
          name: string
        }
        Insert: {
          iconName: string
          id?: string
          name: string
        }
        Update: {
          iconName?: string
          id?: string
          name?: string
        }
        Relationships: []
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
        }
        Insert: {
          categoryId: string
          comboItems?: number | null
          id?: string
          isCombo?: boolean | null
          name: string
          price: number
          stock?: number | null
        }
        Update: {
          categoryId?: string
          comboItems?: number | null
          id?: string
          isCombo?: boolean | null
          name?: string
          price?: number
          stock?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_categoryId_fkey"
            columns: ["categoryId"]
            isOneToOne: false
            referencedRelation: "product_categories"
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
