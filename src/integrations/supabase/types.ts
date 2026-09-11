export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      appointments: {
        Row: {
          consultation_type: string;
          created_at: string;
          handoff_summary: string | null;
          id: string;
          owner_id: string;
          pet_id: string | null;
          price: number;
          reason: string | null;
          scheduled_at: string;
          status: Database["public"]["Enums"]["appointment_status"];
          vet_id: string;
        };
        Insert: {
          consultation_type?: string;
          created_at?: string;
          handoff_summary?: string | null;
          id?: string;
          owner_id: string;
          pet_id?: string | null;
          price?: number;
          reason?: string | null;
          scheduled_at: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          vet_id: string;
        };
        Update: {
          consultation_type?: string;
          created_at?: string;
          handoff_summary?: string | null;
          id?: string;
          owner_id?: string;
          pet_id?: string | null;
          price?: number;
          reason?: string | null;
          scheduled_at?: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          vet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_pet_id_fkey";
            columns: ["pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_vet_id_fkey";
            columns: ["vet_id"];
            isOneToOne: false;
            referencedRelation: "vets";
            referencedColumns: ["id"];
          },
        ];
      };
      clinics: {
        Row: {
          address: string;
          area: string;
          city: string;
          created_at: string;
          id: string;
          is_24x7: boolean;
          is_demo: boolean;
          is_emergency: boolean;
          is_verified: boolean;
          lat: number;
          lng: number;
          name: string;
          phone: string;
        };
        Insert: {
          address: string;
          area: string;
          city?: string;
          created_at?: string;
          id?: string;
          is_24x7?: boolean;
          is_demo?: boolean;
          is_emergency?: boolean;
          is_verified?: boolean;
          lat: number;
          lng: number;
          name: string;
          phone: string;
        };
        Update: {
          address?: string;
          area?: string;
          city?: string;
          created_at?: string;
          id?: string;
          is_24x7?: boolean;
          is_demo?: boolean;
          is_emergency?: boolean;
          is_verified?: boolean;
          lat?: number;
          lng?: number;
          name?: string;
          phone?: string;
        };
        Relationships: [];
      };
      pets: {
        Row: {
          allergies: string | null;
          birth_date: string | null;
          breed: string | null;
          conditions: string | null;
          created_at: string;
          id: string;
          medications: string | null;
          name: string;
          notes: string | null;
          owner_id: string;
          previous_vet: string | null;
          sex: string | null;
          species: string;
          weight_kg: number | null;
        };
        Insert: {
          allergies?: string | null;
          birth_date?: string | null;
          breed?: string | null;
          conditions?: string | null;
          created_at?: string;
          id?: string;
          medications?: string | null;
          name: string;
          notes?: string | null;
          owner_id: string;
          previous_vet?: string | null;
          sex?: string | null;
          species?: string;
          weight_kg?: number | null;
        };
        Update: {
          allergies?: string | null;
          birth_date?: string | null;
          breed?: string | null;
          conditions?: string | null;
          created_at?: string;
          id?: string;
          medications?: string | null;
          name?: string;
          notes?: string | null;
          owner_id?: string;
          previous_vet?: string | null;
          sex?: string | null;
          species?: string;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          area: string | null;
          city: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          phone: string | null;
        };
        Insert: {
          area?: string | null;
          city?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          phone?: string | null;
        };
        Update: {
          area?: string | null;
          city?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          appointment_id: string;
          author_id: string;
          comment: string | null;
          created_at: string;
          id: string;
          rating: number;
          tags: string[];
          vet_id: string;
        };
        Insert: {
          appointment_id: string;
          author_id: string;
          comment?: string | null;
          created_at?: string;
          id?: string;
          rating: number;
          tags?: string[];
          vet_id: string;
        };
        Update: {
          appointment_id?: string;
          author_id?: string;
          comment?: string | null;
          created_at?: string;
          id?: string;
          rating?: number;
          tags?: string[];
          vet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: true;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_vet_id_fkey";
            columns: ["vet_id"];
            isOneToOne: false;
            referencedRelation: "vets";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      vet_documents: {
        Row: {
          file_path: string;
          id: string;
          kind: string;
          uploaded_at: string;
          vet_id: string;
        };
        Insert: {
          file_path: string;
          id?: string;
          kind: string;
          uploaded_at?: string;
          vet_id: string;
        };
        Update: {
          file_path?: string;
          id?: string;
          kind?: string;
          uploaded_at?: string;
          vet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vet_documents_vet_id_fkey";
            columns: ["vet_id"];
            isOneToOne: false;
            referencedRelation: "vets";
            referencedColumns: ["id"];
          },
        ];
      };
      vet_working_hours: {
        Row: {
          closes: string;
          day_of_week: number;
          id: string;
          opens: string;
          vet_id: string;
        };
        Insert: {
          closes: string;
          day_of_week: number;
          id?: string;
          opens: string;
          vet_id: string;
        };
        Update: {
          closes?: string;
          day_of_week?: number;
          id?: string;
          opens?: string;
          vet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vet_working_hours_vet_id_fkey";
            columns: ["vet_id"];
            isOneToOne: false;
            referencedRelation: "vets";
            referencedColumns: ["id"];
          },
        ];
      };
      vets: {
        Row: {
          accepts_emergency: boolean;
          avg_response_minutes: number | null;
          bio: string | null;
          clinic_id: string | null;
          completed_consultations: number;
          consultation_fee: number;
          consultation_types: string[];
          created_at: string;
          current_status: Database["public"]["Enums"]["vet_status"];
          experience_years: number;
          full_name: string;
          home_visit_fee: number | null;
          id: string;
          is_demo: boolean;
          languages: string[];
          pet_types: string[];
          phone: string | null;
          photo_url: string | null;
          qualification: string;
          rating: number | null;
          registration_number: string | null;
          review_count: number;
          specialties: string[];
          status_updated_at: string;
          user_id: string | null;
          verification: Database["public"]["Enums"]["verification_state"];
          verification_notes: string | null;
          verification_reason: string | null;
          verification_reviewed_at: string | null;
          verification_reviewed_by: string | null;
          verification_submitted_at: string | null;
          whatsapp: string | null;
        };
        Insert: {
          accepts_emergency?: boolean;
          avg_response_minutes?: number | null;
          bio?: string | null;
          clinic_id?: string | null;
          completed_consultations?: number;
          consultation_fee?: number;
          consultation_types?: string[];
          created_at?: string;
          current_status?: Database["public"]["Enums"]["vet_status"];
          experience_years?: number;
          full_name: string;
          home_visit_fee?: number | null;
          id?: string;
          is_demo?: boolean;
          languages?: string[];
          pet_types?: string[];
          phone?: string | null;
          photo_url?: string | null;
          qualification: string;
          rating?: number | null;
          registration_number?: string | null;
          review_count?: number;
          specialties?: string[];
          status_updated_at?: string;
          user_id?: string | null;
          verification?: Database["public"]["Enums"]["verification_state"];
          verification_notes?: string | null;
          verification_reason?: string | null;
          verification_reviewed_at?: string | null;
          verification_reviewed_by?: string | null;
          verification_submitted_at?: string | null;
          whatsapp?: string | null;
        };
        Update: {
          accepts_emergency?: boolean;
          avg_response_minutes?: number | null;
          bio?: string | null;
          clinic_id?: string | null;
          completed_consultations?: number;
          consultation_fee?: number;
          consultation_types?: string[];
          created_at?: string;
          current_status?: Database["public"]["Enums"]["vet_status"];
          experience_years?: number;
          full_name?: string;
          home_visit_fee?: number | null;
          id?: string;
          is_demo?: boolean;
          languages?: string[];
          pet_types?: string[];
          phone?: string | null;
          photo_url?: string | null;
          qualification?: string;
          rating?: number | null;
          registration_number?: string | null;
          review_count?: number;
          specialties?: string[];
          status_updated_at?: string;
          user_id?: string | null;
          verification?: Database["public"]["Enums"]["verification_state"];
          verification_notes?: string | null;
          verification_reason?: string | null;
          verification_reviewed_at?: string | null;
          verification_reviewed_by?: string | null;
          verification_submitted_at?: string | null;
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vets_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: false;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "owner" | "vet" | "admin";
      appointment_status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "DECLINED";
      verification_state: "PENDING" | "VERIFIED" | "REJECTED";
      vet_status: "AVAILABLE" | "BUSY" | "OFFLINE" | "EMERGENCY_ONLY";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["owner", "vet", "admin"],
      appointment_status: ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "DECLINED"],
      verification_state: ["PENDING", "VERIFIED", "REJECTED"],
      vet_status: ["AVAILABLE", "BUSY", "OFFLINE", "EMERGENCY_ONLY"],
    },
  },
} as const;
