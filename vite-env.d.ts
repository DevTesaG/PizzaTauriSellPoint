interface ImportMetaEnv {
    readonly VITE_TAURI_DEV_HOST: string;
    readonly VITE_API_URL: string;
    // Add other environment variables here
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }