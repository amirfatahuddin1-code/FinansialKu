/**
 * Workspace Context Singleton.
 * Menyimpan ID workspace aktif saat ini agar dapat diakses
 * secara otomatis oleh modul-modul API Supabase di paket shared ini.
 */
let activeWorkspaceId: string | null = null;

export const workspaceContext = {
  /**
   * Mengambil ID workspace aktif saat ini.
   */
  getActiveWorkspaceId(): string | null {
    return activeWorkspaceId;
  },

  /**
   * Mengubah ID workspace aktif saat ini.
   */
  setActiveWorkspaceId(id: string | null): void {
    activeWorkspaceId = id;
  }
};
