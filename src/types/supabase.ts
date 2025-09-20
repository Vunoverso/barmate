
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
        }
        Insert: {
          id: string
          name: string
          price: number
          categoryId: string
          stock?: number | null
        }
        Update: {
          id?: string
          name?: string
          price?: number
          categoryId?: string
          stock?: number | null
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
