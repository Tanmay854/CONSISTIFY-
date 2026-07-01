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
      ads: {
        Row: {
          active: boolean
          created_at: string
          id: string
          link_url: string | null
          media_type: string
          media_url: string
          placement: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          link_url?: string | null
          media_type?: string
          media_url: string
          placement?: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          link_url?: string | null
          media_type?: string
          media_url?: string
          placement?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      books: {
        Row: {
          amazon_url: string
          author: string
          category: string
          cover_url: string
          cover_url_2: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_best_seller: boolean
          is_featured: boolean
          is_new_release: boolean
          is_trending: boolean
          key_takeaways: string | null
          price: number | null
          public_id: string | null
          rating: number | null
          title: string
          updated_at: string
          why_read: string | null
        }
        Insert: {
          amazon_url: string
          author: string
          category: string
          cover_url: string
          cover_url_2?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_best_seller?: boolean
          is_featured?: boolean
          is_new_release?: boolean
          is_trending?: boolean
          key_takeaways?: string | null
          price?: number | null
          public_id?: string | null
          rating?: number | null
          title: string
          updated_at?: string
          why_read?: string | null
        }
        Update: {
          amazon_url?: string
          author?: string
          category?: string
          cover_url?: string
          cover_url_2?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_best_seller?: boolean
          is_featured?: boolean
          is_new_release?: boolean
          is_trending?: boolean
          key_takeaways?: string | null
          price?: number | null
          public_id?: string | null
          rating?: number | null
          title?: string
          updated_at?: string
          why_read?: string | null
        }
        Relationships: []
      }
      content_views: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          viewer_id: string | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          viewer_id?: string | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          viewer_id?: string | null
        }
        Relationships: []
      }
      courses: {
        Row: {
          affiliate_link: string
          category: string
          cover_image: string
          created_at: string
          created_by: string | null
          curriculum: string | null
          description: string | null
          duration: string | null
          featured: boolean
          hero_image: string | null
          hero_video_url: string | null
          id: string
          instructor: string
          is_best_seller: boolean
          is_new_release: boolean
          lessons_count: number | null
          level: string | null
          published: boolean
          rating: number | null
          requirements: string | null
          subtitle: string | null
          title: string
          trending: boolean
          updated_at: string
          what_youll_learn: string | null
        }
        Insert: {
          affiliate_link?: string
          category?: string
          cover_image?: string
          created_at?: string
          created_by?: string | null
          curriculum?: string | null
          description?: string | null
          duration?: string | null
          featured?: boolean
          hero_image?: string | null
          hero_video_url?: string | null
          id?: string
          instructor?: string
          is_best_seller?: boolean
          is_new_release?: boolean
          lessons_count?: number | null
          level?: string | null
          published?: boolean
          rating?: number | null
          requirements?: string | null
          subtitle?: string | null
          title: string
          trending?: boolean
          updated_at?: string
          what_youll_learn?: string | null
        }
        Update: {
          affiliate_link?: string
          category?: string
          cover_image?: string
          created_at?: string
          created_by?: string | null
          curriculum?: string | null
          description?: string | null
          duration?: string | null
          featured?: boolean
          hero_image?: string | null
          hero_video_url?: string | null
          id?: string
          instructor?: string
          is_best_seller?: boolean
          is_new_release?: boolean
          lessons_count?: number | null
          level?: string | null
          published?: boolean
          rating?: number | null
          requirements?: string | null
          subtitle?: string | null
          title?: string
          trending?: boolean
          updated_at?: string
          what_youll_learn?: string | null
        }
        Relationships: []
      }
      music: {
        Row: {
          artist: string
          audio_url: string | null
          category: string
          created_at: string
          duration: string | null
          id: string
          image_url: string | null
          spotify_id: string | null
          title: string
          uploaded_by: string | null
        }
        Insert: {
          artist?: string
          audio_url?: string | null
          category?: string
          created_at?: string
          duration?: string | null
          id?: string
          image_url?: string | null
          spotify_id?: string | null
          title: string
          uploaded_by?: string | null
        }
        Update: {
          artist?: string
          audio_url?: string | null
          category?: string
          created_at?: string
          duration?: string | null
          id?: string
          image_url?: string | null
          spotify_id?: string | null
          title?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      music_cache: {
        Row: {
          key: string
          payload: Json
          updated_at: string
        }
        Insert: {
          key: string
          payload: Json
          updated_at?: string
        }
        Update: {
          key?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          bunny_storage_path: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string
          is_pro: boolean
          public_id: string
          set_id: string | null
          set_position: number
          title: string | null
          uploaded_by: string | null
        }
        Insert: {
          bunny_storage_path?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          is_pro?: boolean
          public_id?: string
          set_id?: string | null
          set_position?: number
          title?: string | null
          uploaded_by?: string | null
        }
        Update: {
          bunny_storage_path?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          is_pro?: boolean
          public_id?: string
          set_id?: string | null
          set_position?: number
          title?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      reels: {
        Row: {
          author_name: string | null
          bunny_library_id: string | null
          bunny_video_guid: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          public_id: string
          title: string | null
          trim_end: number | null
          trim_start: number | null
          uploaded_by: string | null
          video_fit: string
          video_url: string
        }
        Insert: {
          author_name?: string | null
          bunny_library_id?: string | null
          bunny_video_guid?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          public_id?: string
          title?: string | null
          trim_end?: number | null
          trim_start?: number | null
          uploaded_by?: string | null
          video_fit?: string
          video_url: string
        }
        Update: {
          author_name?: string | null
          bunny_library_id?: string | null
          bunny_video_guid?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          public_id?: string
          title?: string | null
          trim_end?: number | null
          trim_start?: number | null
          uploaded_by?: string | null
          video_fit?: string
          video_url?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          issue_description: string
          reporter_email: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          issue_description: string
          reporter_email?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          issue_description?: string
          reporter_email?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      spotify_connections: {
        Row: {
          access_token: string
          created_at: string
          display_name: string | null
          expires_at: string
          refresh_token: string
          scope: string
          spotify_user_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          display_name?: string | null
          expires_at: string
          refresh_token: string
          scope?: string
          spotify_user_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          display_name?: string | null
          expires_at?: string
          refresh_token?: string
          scope?: string
          spotify_user_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      uploader_applications: {
        Row: {
          created_at: string
          email: string | null
          id: string
          reason: string
          requested_role: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          reason: string
          requested_role?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          reason?: string
          requested_role?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_album_tracks: {
        Row: {
          added_at: string
          album_id: string
          artist: string
          id: string
          image: string | null
          name: string
          position: number
          spotify_track_id: string
          uri: string
        }
        Insert: {
          added_at?: string
          album_id: string
          artist?: string
          id?: string
          image?: string | null
          name: string
          position?: number
          spotify_track_id: string
          uri: string
        }
        Update: {
          added_at?: string
          album_id?: string
          artist?: string
          id?: string
          image?: string | null
          name?: string
          position?: number
          spotify_track_id?: string
          uri?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_album_tracks_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "user_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      user_albums: {
        Row: {
          cover_url: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          id: string
          selected_categories: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          selected_categories?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          selected_categories?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      view_counts: {
        Row: {
          content_id: string
          content_type: string
          total_views: number
          updated_at: string
        }
        Insert: {
          content_id: string
          content_type: string
          total_views?: number
          updated_at?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          total_views?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gen_public_id6: { Args: never; Returns: string }
      get_uploader_emails: {
        Args: { _user_ids: string[] }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      refresh_view_counts: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "uploader" | "user" | "super_admin"
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
      app_role: ["admin", "uploader", "user", "super_admin"],
    },
  },
} as const
