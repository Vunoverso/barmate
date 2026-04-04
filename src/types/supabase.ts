export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	public: {
		Tables: {
			organizations: {
				Row: {
					id: string;
					trade_name: string;
					owner_email: string | null;
					owner_name: string | null;
					owner_user_id: string | null;
					plan_id: string;
					status: string;
					created_at: string;
					updated_at: string;
					trial_ends_at: string | null;
				};
				Insert: {
					id: string;
					trade_name: string;
					owner_email?: string | null;
					owner_name?: string | null;
					owner_user_id?: string | null;
					plan_id?: string;
					status?: string;
					created_at?: string;
					updated_at?: string;
					trial_ends_at?: string | null;
				};
				Update: Partial<Database['public']['Tables']['organizations']['Insert']>;
			};
			organization_members: {
				Row: {
					id: string;
					organization_id: string;
					user_id: string;
					role: string;
					created_at: string;
				};
				Insert: {
					id?: string;
					organization_id: string;
					user_id: string;
					role?: string;
					created_at?: string;
				};
				Update: Partial<Database['public']['Tables']['organization_members']['Insert']>;
			};
			app_documents: {
				Row: {
					id: string;
					organization_id: string | null;
					collection_name: string;
					document_key: string;
					payload: Json;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					organization_id?: string | null;
					collection_name: string;
					document_key: string;
					payload?: Json;
					created_at?: string;
					updated_at?: string;
				};
				Update: Partial<Database['public']['Tables']['app_documents']['Insert']>;
			};
			site_content: {
				Row: {
					key: string;
					payload: Json;
					updated_at: string;
				};
				Insert: {
					key: string;
					payload?: Json;
					updated_at?: string;
				};
				Update: Partial<Database['public']['Tables']['site_content']['Insert']>;
			};
			tickets: {
				Row: {
					id: string;
					organization_id: string;
					subject: string;
					priority: string;
					status: string;
					payload: Json;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					organization_id: string;
					subject: string;
					priority?: string;
					status?: string;
					payload?: Json;
					created_at?: string;
					updated_at?: string;
				};
				Update: Partial<Database['public']['Tables']['tickets']['Insert']>;
			};
			cancellations: {
				Row: {
					id: string;
					organization_id: string;
					reason: string;
					status: string;
					ltv: number;
					payload: Json;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					organization_id: string;
					reason: string;
					status?: string;
					ltv?: number;
					payload?: Json;
					created_at?: string;
					updated_at?: string;
				};
				Update: Partial<Database['public']['Tables']['cancellations']['Insert']>;
			};
			admin_config: {
				Row: {
					key: string;
					payload: Json;
					updated_at: string;
				};
				Insert: {
					key: string;
					payload?: Json;
					updated_at?: string;
				};
				Update: Partial<Database['public']['Tables']['admin_config']['Insert']>;
			};
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: Record<string, never>;
		CompositeTypes: Record<string, never>;
	};
};
