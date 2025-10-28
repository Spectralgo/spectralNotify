// Type declarations for Drizzle ORM durable-sqlite migrations
// This allows TypeScript to recognize migrations.js imports

declare module "*/migrations.js" {
  const migrations: {
    journal: {
      version: string;
      dialect: string;
      entries: Array<{
        idx: number;
        version: string;
        when: number;
        tag: string;
        breakpoints: boolean;
      }>;
    };
    migrations: Record<string, string>;
  };
  export default migrations;
}
