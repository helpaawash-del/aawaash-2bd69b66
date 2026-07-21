export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          new_value: Json | null
          previous_value: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_value?: Json | null
          previous_value?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_value?: Json | null
          previous_value?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      buildings: {
        Row: {
          code: string
          cover_url: string | null
          created_at: string
          description: string | null
          extra: Json
          id: string
          name: string
          ordering: number
          project_id: string
          total_flats: number
          total_floors: number
          updated_at: string
        }
        Insert: {
          code: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          extra?: Json
          id?: string
          name: string
          ordering?: number
          project_id: string
          total_flats?: number
          total_floors?: number
          updated_at?: string
        }
        Update: {
          code?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          extra?: Json
          id?: string
          name?: string
          ordering?: number
          project_id?: string
          total_flats?: number
          total_floors?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
          created_at: string
          id: string
          sale_id: string | null
          status: string
          team_id: string | null
          tier: number
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          sale_id?: string | null
          status?: string
          team_id?: string | null
          tier?: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          sale_id?: string | null
          status?: string
          team_id?: string | null
          tier?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_meetings: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          followup_at: string | null
          id: string
          location: string | null
          meeting_type: Database["public"]["Enums"]["meeting_type"]
          outcome: string | null
          project_id: string | null
          remarks: string | null
          reminder_at: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["meeting_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          followup_at?: string | null
          id?: string
          location?: string | null
          meeting_type?: Database["public"]["Enums"]["meeting_type"]
          outcome?: string | null
          project_id?: string | null
          remarks?: string | null
          reminder_at?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["meeting_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          followup_at?: string | null
          id?: string
          location?: string | null
          meeting_type?: Database["public"]["Enums"]["meeting_type"]
          outcome?: string | null
          project_id?: string | null
          remarks?: string | null
          reminder_at?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["meeting_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_meetings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          customer_id: string
          id: string
          is_pinned: boolean
          updated_at: string
          visibility: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          customer_id: string
          id?: string
          is_pinned?: boolean
          updated_at?: string
          visibility?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_pinned?: boolean
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_timeline: {
        Row: {
          actor_id: string | null
          created_at: string
          customer_id: string
          detail: string | null
          event: string
          id: string
          metadata: Json
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          customer_id: string
          detail?: string | null
          event: string
          id?: string
          metadata?: Json
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          customer_id?: string
          detail?: string | null
          event?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "customer_timeline_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_timeline_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          alt_mobile_number: string | null
          assigned_leader_id: string | null
          assigned_member_id: string | null
          budget_max: number | null
          budget_min: number | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          created_by: string | null
          customer_code: string
          email: string | null
          expected_purchase_date: string | null
          full_name: string
          id: string
          is_archived: boolean
          last_contact_at: string | null
          lead_source: string | null
          meeting_count: number
          meta: Json
          mobile_number: string
          monthly_income: number | null
          next_followup_at: string | null
          notes: string | null
          occupation: string | null
          pin_code: string | null
          preferred_area: string | null
          preferred_config: string | null
          preferred_flat_id: string | null
          preferred_project_id: string | null
          priority: Database["public"]["Enums"]["customer_priority"]
          purchase_probability: number | null
          state: string | null
          status: Database["public"]["Enums"]["customer_status"]
          tags: string[]
          team_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          alt_mobile_number?: string | null
          assigned_leader_id?: string | null
          assigned_member_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          customer_code?: string
          email?: string | null
          expected_purchase_date?: string | null
          full_name: string
          id?: string
          is_archived?: boolean
          last_contact_at?: string | null
          lead_source?: string | null
          meeting_count?: number
          meta?: Json
          mobile_number: string
          monthly_income?: number | null
          next_followup_at?: string | null
          notes?: string | null
          occupation?: string | null
          pin_code?: string | null
          preferred_area?: string | null
          preferred_config?: string | null
          preferred_flat_id?: string | null
          preferred_project_id?: string | null
          priority?: Database["public"]["Enums"]["customer_priority"]
          purchase_probability?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          tags?: string[]
          team_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          alt_mobile_number?: string | null
          assigned_leader_id?: string | null
          assigned_member_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          customer_code?: string
          email?: string | null
          expected_purchase_date?: string | null
          full_name?: string
          id?: string
          is_archived?: boolean
          last_contact_at?: string | null
          lead_source?: string | null
          meeting_count?: number
          meta?: Json
          mobile_number?: string
          monthly_income?: number | null
          next_followup_at?: string | null
          notes?: string | null
          occupation?: string | null
          pin_code?: string | null
          preferred_area?: string | null
          preferred_config?: string | null
          preferred_flat_id?: string | null
          preferred_project_id?: string | null
          priority?: Database["public"]["Enums"]["customer_priority"]
          purchase_probability?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          tags?: string[]
          team_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_assigned_leader_id_fkey"
            columns: ["assigned_leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_assigned_member_id_fkey"
            columns: ["assigned_member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_preferred_flat_id_fkey"
            columns: ["preferred_flat_id"]
            isOneToOne: false
            referencedRelation: "flats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_preferred_project_id_fkey"
            columns: ["preferred_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flat_locks: {
        Row: {
          created_at: string
          expires_at: string
          flat_id: string
          id: string
          locked_by: string | null
          reason: string | null
          released: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          flat_id: string
          id?: string
          locked_by?: string | null
          reason?: string | null
          released?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          flat_id?: string
          id?: string
          locked_by?: string | null
          reason?: string | null
          released?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flat_locks_flat_id_fkey"
            columns: ["flat_id"]
            isOneToOne: false
            referencedRelation: "flats"
            referencedColumns: ["id"]
          },
        ]
      }
      flats: {
        Row: {
          admin_notes: string | null
          area_sqft: number | null
          balconies: number
          bathrooms: number
          bedrooms: number
          booking_status: string
          building_id: string
          configuration: string | null
          construction_stage: string | null
          created_at: string
          extra: Json
          facing: string | null
          floor_id: string
          floor_plan_url: string | null
          gallery: Json
          id: string
          price: number | null
          project_id: string
          status: string
          unit_code: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          area_sqft?: number | null
          balconies?: number
          bathrooms?: number
          bedrooms?: number
          booking_status?: string
          building_id: string
          configuration?: string | null
          construction_stage?: string | null
          created_at?: string
          extra?: Json
          facing?: string | null
          floor_id: string
          floor_plan_url?: string | null
          gallery?: Json
          id?: string
          price?: number | null
          project_id: string
          status?: string
          unit_code: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          area_sqft?: number | null
          balconies?: number
          bathrooms?: number
          bedrooms?: number
          booking_status?: string
          building_id?: string
          configuration?: string | null
          construction_stage?: string | null
          created_at?: string
          extra?: Json
          facing?: string | null
          floor_id?: string
          floor_plan_url?: string | null
          gallery?: Json
          id?: string
          price?: number | null
          project_id?: string
          status?: string
          unit_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flats_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flats_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flats_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      floors: {
        Row: {
          building_id: string
          created_at: string
          extra: Json
          floor_plan_url: string | null
          id: string
          name: string | null
          number: number
          ordering: number
          project_id: string
          total_flats: number
          updated_at: string
        }
        Insert: {
          building_id: string
          created_at?: string
          extra?: Json
          floor_plan_url?: string | null
          id?: string
          name?: string | null
          number: number
          ordering?: number
          project_id: string
          total_flats?: number
          updated_at?: string
        }
        Update: {
          building_id?: string
          created_at?: string
          extra?: Json
          floor_plan_url?: string | null
          id?: string
          name?: string | null
          number?: number
          ordering?: number
          project_id?: string
          total_flats?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "floors_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          kind: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          display_code: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          is_deleted: boolean
          last_login_at: string | null
          login_id: string
          mobile_number: string
          referral_count: number
          status: Database["public"]["Enums"]["account_status"]
          team_id: string | null
          total_earnings: number
          total_sales: number
          updated_at: string
          updated_by: string | null
          wallet_balance: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          display_code?: string
          email?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          is_deleted?: boolean
          last_login_at?: string | null
          login_id: string
          mobile_number: string
          referral_count?: number
          status?: Database["public"]["Enums"]["account_status"]
          team_id?: string | null
          total_earnings?: number
          total_sales?: number
          updated_at?: string
          updated_by?: string | null
          wallet_balance?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          display_code?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          last_login_at?: string | null
          login_id?: string
          mobile_number?: string
          referral_count?: number
          status?: Database["public"]["Enums"]["account_status"]
          team_id?: string | null
          total_earnings?: number
          total_sales?: number
          updated_at?: string
          updated_by?: string | null
          wallet_balance?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      project_favorites: {
        Row: {
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_favorites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          amenities: string[]
          area_max: number | null
          area_min: number | null
          available_flats: number
          completion_percent: number
          construction_status: string
          cover_url: string | null
          created_at: string
          description: string | null
          display_priority: number
          extra: Json
          floor_plan_count: number
          gallery_count: number
          google_map_url: string | null
          hero_banner_url: string | null
          hero_hue: string
          id: string
          is_deleted: boolean
          latitude: number | null
          launch_date: string | null
          location: string
          logo_url: string | null
          longitude: number | null
          model_count: number
          name: string
          possession_date: string | null
          price_from: number
          price_max: number | null
          price_min: number | null
          project_type: string
          reserved_flats: number
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          sold_flats: number
          sold_units: number
          status: string
          tag: string | null
          thumbnail_url: string | null
          total_buildings: number
          total_flats: number
          total_floors: number
          total_units: number
          updated_at: string
          video_count: number
          visibility: string
        }
        Insert: {
          address?: string | null
          amenities?: string[]
          area_max?: number | null
          area_min?: number | null
          available_flats?: number
          completion_percent?: number
          construction_status?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          display_priority?: number
          extra?: Json
          floor_plan_count?: number
          gallery_count?: number
          google_map_url?: string | null
          hero_banner_url?: string | null
          hero_hue?: string
          id?: string
          is_deleted?: boolean
          latitude?: number | null
          launch_date?: string | null
          location: string
          logo_url?: string | null
          longitude?: number | null
          model_count?: number
          name: string
          possession_date?: string | null
          price_from?: number
          price_max?: number | null
          price_min?: number | null
          project_type?: string
          reserved_flats?: number
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          sold_flats?: number
          sold_units?: number
          status?: string
          tag?: string | null
          thumbnail_url?: string | null
          total_buildings?: number
          total_flats?: number
          total_floors?: number
          total_units?: number
          updated_at?: string
          video_count?: number
          visibility?: string
        }
        Update: {
          address?: string | null
          amenities?: string[]
          area_max?: number | null
          area_min?: number | null
          available_flats?: number
          completion_percent?: number
          construction_status?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          display_priority?: number
          extra?: Json
          floor_plan_count?: number
          gallery_count?: number
          google_map_url?: string | null
          hero_banner_url?: string | null
          hero_hue?: string
          id?: string
          is_deleted?: boolean
          latitude?: number | null
          launch_date?: string | null
          location?: string
          logo_url?: string | null
          longitude?: number | null
          model_count?: number
          name?: string
          possession_date?: string | null
          price_from?: number
          price_max?: number | null
          price_min?: number | null
          project_type?: string
          reserved_flats?: number
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
          sold_flats?: number
          sold_units?: number
          status?: string
          tag?: string | null
          thumbnail_url?: string | null
          total_buildings?: number
          total_flats?: number
          total_floors?: number
          total_units?: number
          updated_at?: string
          video_count?: number
          visibility?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          address: string | null
          alt_mobile: string | null
          created_at: string
          customer_name: string
          expected_timeline: string | null
          id: string
          interested_project: string | null
          meeting_notes: string | null
          meeting_status: string
          member_id: string
          mobile_number: string
          potential_commission: number
          preferred_budget: number | null
          preferred_flat: string | null
          project_id: string | null
          purchase_status: string
          remarks: string | null
          status: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          alt_mobile?: string | null
          created_at?: string
          customer_name: string
          expected_timeline?: string | null
          id?: string
          interested_project?: string | null
          meeting_notes?: string | null
          meeting_status?: string
          member_id: string
          mobile_number: string
          potential_commission?: number
          preferred_budget?: number | null
          preferred_flat?: string | null
          project_id?: string | null
          purchase_status?: string
          remarks?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          alt_mobile?: string | null
          created_at?: string
          customer_name?: string
          expected_timeline?: string | null
          id?: string
          interested_project?: string | null
          meeting_notes?: string | null
          meeting_status?: string
          member_id?: string
          mobile_number?: string
          potential_commission?: number
          preferred_budget?: number | null
          preferred_flat?: string | null
          project_id?: string | null
          purchase_status?: string
          remarks?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          buyer_mobile: string | null
          buyer_name: string
          contact_visible: boolean
          created_at: string
          customer_status: string
          deal_value: number
          id: string
          notes: string | null
          payment_status: string
          project_id: string | null
          sale_date: string
          seller_id: string | null
          status: string
          team_id: string | null
          unit_label: string | null
        }
        Insert: {
          buyer_mobile?: string | null
          buyer_name: string
          contact_visible?: boolean
          created_at?: string
          customer_status?: string
          deal_value?: number
          id?: string
          notes?: string | null
          payment_status?: string
          project_id?: string | null
          sale_date?: string
          seller_id?: string | null
          status?: string
          team_id?: string | null
          unit_label?: string | null
        }
        Update: {
          buyer_mobile?: string | null
          buyer_name?: string
          contact_visible?: boolean
          created_at?: string
          customer_status?: string
          deal_value?: number
          id?: string
          notes?: string | null
          payment_status?: string
          project_id?: string | null
          sale_date?: string
          seller_id?: string | null
          status?: string
          team_id?: string | null
          unit_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_deleted: boolean
          leader_id: string | null
          letter: string
          name: string
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_deleted?: boolean
          leader_id?: string | null
          letter: string
          name: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_deleted?: boolean
          leader_id?: string | null
          letter?: string
          name?: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tip_persons: {
        Row: {
          created_at: string
          customer_contact: string | null
          customer_name: string
          id: string
          interested_project: string | null
          member_id: string
          notes: string | null
          project_id: string | null
          relationship: string | null
          status: string
          team_id: string | null
          tip_address: string | null
          tip_mobile: string
          tip_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_contact?: string | null
          customer_name: string
          id?: string
          interested_project?: string | null
          member_id: string
          notes?: string | null
          project_id?: string | null
          relationship?: string | null
          status?: string
          team_id?: string | null
          tip_address?: string | null
          tip_mobile: string
          tip_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_contact?: string | null
          customer_name?: string
          id?: string
          interested_project?: string | null
          member_id?: string
          notes?: string | null
          project_id?: string | null
          relationship?: string | null
          status?: string
          team_id?: string | null
          tip_address?: string | null
          tip_mobile?: string
          tip_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tip_persons_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tip_persons_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tip_persons_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          id: string
          note: string | null
          processed_at: string | null
          requested_at: string
          status: string
          team_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          id?: string
          note?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: string
          team_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          id?: string
          note?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: string
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team_leader_of: { Args: { _team_id: string }; Returns: boolean }
      my_team_id: { Args: never; Returns: string }
      recompute_project_flat_counts: {
        Args: { p_project_id: string }
        Returns: undefined
      }
    }
    Enums: {
      account_status: "active" | "suspended" | "pending"
      app_role: "super_admin" | "team_leader" | "member"
      customer_priority: "low" | "normal" | "high" | "vip"
      customer_status:
        | "new_lead"
        | "contacted"
        | "meeting_scheduled"
        | "meeting_completed"
        | "interested"
        | "flat_selected"
        | "price_discussion"
        | "documentation"
        | "booking_amount"
        | "booking_confirmed"
        | "agreement"
        | "registration"
        | "sale_completed"
        | "commission_generated"
        | "closed"
        | "not_interested"
        | "on_hold"
        | "cancelled"
        | "lost"
        | "future_followup"
      meeting_status:
        | "scheduled"
        | "completed"
        | "cancelled"
        | "missed"
        | "rescheduled"
      meeting_type: "call" | "in_person" | "site_visit" | "virtual" | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["active", "suspended", "pending"],
      app_role: ["super_admin", "team_leader", "member"],
      customer_priority: ["low", "normal", "high", "vip"],
      customer_status: [
        "new_lead",
        "contacted",
        "meeting_scheduled",
        "meeting_completed",
        "interested",
        "flat_selected",
        "price_discussion",
        "documentation",
        "booking_amount",
        "booking_confirmed",
        "agreement",
        "registration",
        "sale_completed",
        "commission_generated",
        "closed",
        "not_interested",
        "on_hold",
        "cancelled",
        "lost",
        "future_followup",
      ],
      meeting_status: [
        "scheduled",
        "completed",
        "cancelled",
        "missed",
        "rescheduled",
      ],
      meeting_type: ["call", "in_person", "site_visit", "virtual", "other"],
    },
  },
} as const
