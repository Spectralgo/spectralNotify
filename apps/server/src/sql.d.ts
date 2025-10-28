// Type declarations for importing .sql files as string modules
// This allows TypeScript to recognize SQL file imports in migrations

declare module "*.sql" {
  const content: string;
  export default content;
}
