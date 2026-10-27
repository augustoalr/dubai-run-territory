export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      cell_efforts: {
        Row: {
          crossed_at: string;
          h3: string;
          id: string;
          league_id: string;
          pace_s: number;
          run_id: string;
          season_id: string;
          user_id: string;
          window_end_m: number;
          window_start_m: number;
          zone_id: string;
        };
        ComputedFields: never;
        Insert: {
          crossed_at: string;
          h3: string;
          id?: string;
          league_id: string;
          pace_s: number;
          run_id: string;
          season_id: string;
          user_id: string;
          window_end_m: number;
          window_start_m: number;
          zone_id: string;
        };
        Update: {
          crossed_at?: string;
          h3?: string;
          id?: string;
          league_id?: string;
          pace_s?: number;
          run_id?: string;
          season_id?: string;
          user_id?: string;
          window_end_m?: number;
          window_start_m?: number;
          zone_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cell_efforts_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cell_efforts_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cell_efforts_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cell_efforts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cell_efforts_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "zones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cell_efforts_zone_id_h3_fkey";
            columns: ["zone_id", "h3"];
            isOneToOne: false;
            referencedRelation: "zone_cells";
            referencedColumns: ["zone_id", "h3"];
          },
        ];
      };
      cell_ownership: {
        Row: {
          achieved_at: string;
          effort_id: string;
          h3: string;
          league_id: string;
          owner_id: string;
          pace_s: number;
          season_id: string;
          since: string;
          zone_id: string;
        };
        ComputedFields: never;
        Insert: {
          achieved_at: string;
          effort_id: string;
          h3: string;
          league_id: string;
          owner_id: string;
          pace_s: number;
          season_id: string;
          since?: string;
          zone_id: string;
        };
        Update: {
          achieved_at?: string;
          effort_id?: string;
          h3?: string;
          league_id?: string;
          owner_id?: string;
          pace_s?: number;
          season_id?: string;
          since?: string;
          zone_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cell_ownership_effort_id_fkey";
            columns: ["effort_id"];
            isOneToOne: false;
            referencedRelation: "cell_efforts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cell_ownership_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cell_ownership_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cell_ownership_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cell_ownership_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "zones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cell_ownership_zone_id_h3_fkey";
            columns: ["zone_id", "h3"];
            isOneToOne: false;
            referencedRelation: "zone_cells";
            referencedColumns: ["zone_id", "h3"];
          },
        ];
      };
      daily_points: {
        Row: {
          cells_owned: number;
          day: string;
          league_id: string;
          points: number;
          season_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          cells_owned: number;
          day: string;
          league_id: string;
          points: number;
          season_id: string;
          user_id: string;
        };
        Update: {
          cells_owned?: number;
          day?: string;
          league_id?: string;
          points?: number;
          season_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_points_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_points_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_points_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      leagues: {
        Row: {
          code: string;
          id: string;
          max_pace_s: number | null;
          min_pace_s: number | null;
          name: string;
          sort: number;
          zone_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          id?: string;
          max_pace_s?: number | null;
          min_pace_s?: number | null;
          name: string;
          sort: number;
          zone_id?: string | null;
        };
        Update: {
          code?: string;
          id?: string;
          max_pace_s?: number | null;
          min_pace_s?: number | null;
          name?: string;
          sort?: number;
          zone_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "leagues_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "zones";
            referencedColumns: ["id"];
          },
        ];
      };
      ownership_events: {
        Row: {
          actor_id: string;
          created_at: string;
          h3: string;
          id: string;
          league_id: string;
          prev_owner_id: string | null;
          run_id: string;
          season_id: string;
          type: string;
          zone_id: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id: string;
          created_at?: string;
          h3: string;
          id?: string;
          league_id: string;
          prev_owner_id?: string | null;
          run_id: string;
          season_id: string;
          type: string;
          zone_id: string;
        };
        Update: {
          actor_id?: string;
          created_at?: string;
          h3?: string;
          id?: string;
          league_id?: string;
          prev_owner_id?: string | null;
          run_id?: string;
          season_id?: string;
          type?: string;
          zone_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ownership_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ownership_events_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ownership_events_prev_owner_id_fkey";
            columns: ["prev_owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ownership_events_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ownership_events_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ownership_events_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "zones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ownership_events_zone_id_h3_fkey";
            columns: ["zone_id", "h3"];
            isOneToOne: false;
            referencedRelation: "zone_cells";
            referencedColumns: ["zone_id", "h3"];
          },
        ];
      };
      profiles: {
        Row: {
          alias: string | null;
          created_at: string;
          id: string;
          is_admin: boolean;
        };
        ComputedFields: never;
        Insert: {
          alias?: string | null;
          created_at?: string;
          id: string;
          is_admin?: boolean;
        };
        Update: {
          alias?: string | null;
          created_at?: string;
          id?: string;
          is_admin?: boolean;
        };
        Relationships: [];
      };
      provider_connections: {
        Row: {
          connected_at: string;
          disconnected_at: string | null;
          id: string;
          provider: Database["public"]["Enums"]["activity_provider"];
          tokens: NonNullable<Json>;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          connected_at?: string;
          disconnected_at?: string | null;
          id?: string;
          provider: Database["public"]["Enums"]["activity_provider"];
          tokens: NonNullable<Json>;
          user_id: string;
        };
        Update: {
          connected_at?: string;
          disconnected_at?: string | null;
          id?: string;
          provider?: Database["public"]["Enums"]["activity_provider"];
          tokens?: NonNullable<Json>;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "provider_connections_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          id: string;
          reason: string;
          reporter_id: string;
          run_id: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          reason: string;
          reporter_id: string;
          run_id: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          reason?: string;
          reporter_id?: string;
          run_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "runs";
            referencedColumns: ["id"];
          },
        ];
      };
      runs: {
        Row: {
          created_at: string;
          distance_in_zone_m: number | null;
          ended_at: string | null;
          external_activity_id: string | null;
          file_sha256: string;
          flags: NonNullable<Json>;
          format: string;
          id: string;
          league_id: string | null;
          reject_code: string | null;
          season_id: string | null;
          source: Database["public"]["Enums"]["run_source"];
          sport: string | null;
          started_at: string | null;
          status: string;
          storage_path: string;
          track_hash: string | null;
          track_in_zone: unknown;
          user_id: string;
          zone_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          distance_in_zone_m?: number | null;
          ended_at?: string | null;
          external_activity_id?: string | null;
          file_sha256: string;
          flags?: NonNullable<Json>;
          format: string;
          id?: string;
          league_id?: string | null;
          reject_code?: string | null;
          season_id?: string | null;
          source?: Database["public"]["Enums"]["run_source"];
          sport?: string | null;
          started_at?: string | null;
          status?: string;
          storage_path: string;
          track_hash?: string | null;
          track_in_zone?: unknown;
          user_id: string;
          zone_id: string;
        };
        Update: {
          created_at?: string;
          distance_in_zone_m?: number | null;
          ended_at?: string | null;
          external_activity_id?: string | null;
          file_sha256?: string;
          flags?: NonNullable<Json>;
          format?: string;
          id?: string;
          league_id?: string | null;
          reject_code?: string | null;
          season_id?: string | null;
          source?: Database["public"]["Enums"]["run_source"];
          sport?: string | null;
          started_at?: string | null;
          status?: string;
          storage_path?: string;
          track_hash?: string | null;
          track_in_zone?: unknown;
          user_id?: string;
          zone_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "runs_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "runs_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "runs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "runs_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "zones";
            referencedColumns: ["id"];
          },
        ];
      };
      seasons: {
        Row: {
          ends_at: string;
          id: string;
          name: string;
          starts_at: string;
          status: string;
          zone_id: string;
        };
        ComputedFields: never;
        Insert: {
          ends_at: string;
          id?: string;
          name: string;
          starts_at: string;
          status?: string;
          zone_id: string;
        };
        Update: {
          ends_at?: string;
          id?: string;
          name?: string;
          starts_at?: string;
          status?: string;
          zone_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seasons_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "zones";
            referencedColumns: ["id"];
          },
        ];
      };
      user_leagues: {
        Row: {
          id: string;
          league_id: string;
          reason: string;
          ref_pace_s: number;
          season_id: string;
          user_id: string;
          valid_from: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          league_id: string;
          reason: string;
          ref_pace_s: number;
          season_id: string;
          user_id: string;
          valid_from?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          reason?: string;
          ref_pace_s?: number;
          season_id?: string;
          user_id?: string;
          valid_from?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_leagues_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_leagues_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_leagues_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      zone_cells: {
        Row: {
          boundary: unknown;
          center: unknown;
          h3: string;
          zone_id: string;
        };
        ComputedFields: never;
        Insert: {
          boundary: unknown;
          center: unknown;
          h3: string;
          zone_id: string;
        };
        Update: {
          boundary?: unknown;
          center?: unknown;
          h3?: string;
          zone_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "zone_cells_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "zones";
            referencedColumns: ["id"];
          },
        ];
      };
      zones: {
        Row: {
          created_at: string;
          h3_res: number;
          id: string;
          name: string;
          polygon: unknown;
          slug: string;
          status: string;
          timezone: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          h3_res: number;
          id?: string;
          name: string;
          polygon: unknown;
          slug: string;
          status?: string;
          timezone?: string;
        };
        Update: {
          created_at?: string;
          h3_res?: number;
          id?: string;
          name?: string;
          polygon?: unknown;
          slug?: string;
          status?: string;
          timezone?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: {
      activity_provider: "garmin" | "polar";
      run_source: "upload" | "garmin" | "polar" | "browser";
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      activity_provider: ["garmin", "polar"],
      run_source: ["upload", "garmin", "polar", "browser"],
    },
  },
} as const;
