export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      alerts: {
        Row: {
          created_at: string;
          id: string;
          reason: string;
          scheme_id: string;
          scheme_name: string;
          seen: boolean;
          session_key: string;
          urgency: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          reason: string;
          scheme_id: string;
          scheme_name: string;
          seen?: boolean;
          session_key: string;
          urgency?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          reason?: string;
          scheme_id?: string;
          scheme_name?: string;
          seen?: boolean;
          session_key?: string;
          urgency?: string;
        };
        Relationships: [];
      };
      schemes: {
        Row: {
          application_mode: string;
          application_steps: string[];
          application_url: string | null;
          benefit_amount: string;
          benefit_type: string;
          confidence_level: string;
          created_at: string;
          description: string;
          documents_required: string[];
          eligibility: Json;
          id: string;
          keywords: string[];
          last_verified: string;
          ministry: string;
          scheme_code: string | null;
          scheme_name: string;
          source_url: string;
          state_scope: string;
        };
        Insert: {
          application_mode?: string;
          application_steps?: string[];
          application_url?: string | null;
          benefit_amount: string;
          benefit_type: string;
          confidence_level?: string;
          created_at?: string;
          description: string;
          documents_required?: string[];
          eligibility: Json;
          id: string;
          keywords?: string[];
          last_verified: string;
          ministry: string;
          scheme_code?: string | null;
          scheme_name: string;
          source_url: string;
          state_scope?: string;
        };
        Update: {
          application_mode?: string;
          application_steps?: string[];
          application_url?: string | null;
          benefit_amount?: string;
          benefit_type?: string;
          confidence_level?: string;
          created_at?: string;
          description?: string;
          documents_required?: string[];
          eligibility?: Json;
          id?: string;
          keywords?: string[];
          last_verified?: string;
          ministry?: string;
          scheme_code?: string | null;
          scheme_name?: string;
          source_url?: string;
          state_scope?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          created_at: string;
          found_schemes: Json;
          id: string;
          last_scan_at: string | null;
          profile: Json;
          report_markdown: string | null;
          safety_status: string | null;
          session_key: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          found_schemes?: Json;
          id?: string;
          last_scan_at?: string | null;
          profile: Json;
          report_markdown?: string | null;
          safety_status?: string | null;
          session_key: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          found_schemes?: Json;
          id?: string;
          last_scan_at?: string | null;
          profile?: Json;
          report_markdown?: string | null;
          safety_status?: string | null;
          session_key?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
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
  public: {
    Enums: {},
  },
} as const;
