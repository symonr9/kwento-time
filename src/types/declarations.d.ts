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
