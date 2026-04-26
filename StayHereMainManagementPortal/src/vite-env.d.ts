/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROPERTY_OWNER_API: string;
  readonly VITE_PROPERTY_API: string;
  readonly VITE_CUSTOMER_API: string;
  readonly VITE_STATIC_API: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
