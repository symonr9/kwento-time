// Drizzle's generated migrations bundle imports raw `.sql` files, which
// babel-plugin-inline-import turns into strings at build time. Declare the
// module so TypeScript resolves those imports.
declare module '*.sql' {
  const content: string;
  export default content;
}

// Metro handles CSS (web/global styles); declare the modules so `tsc` resolves
// the template's side-effect and CSS-module imports.
declare module '*.css';
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.gguf' {
  const asset: number;
  export default asset;
}

declare module 'llama.rn' {
  export function initLlama(options: {
    model: string;
    n_ctx: number;
    n_gpu_layers?: number;
    use_mlock?: boolean;
  }): Promise<{
    completion(
      params: {
        messages: { content: string; role: 'system' | 'user' }[];
        n_predict: number;
        stop: string[];
        temperature: number;
        top_k: number;
        top_p: number;
      },
      onPartialCompletion?: (data: { token?: string }) => void,
    ): Promise<{ text?: string }>;
    release?: () => Promise<void> | void;
  }>;
}
