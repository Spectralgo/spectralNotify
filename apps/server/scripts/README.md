# Server Scripts

This directory contains automation scripts for the server application.

## counter-migrate.sh

Automated Counter Durable Object migration workflow.

### What it does

The script automates the entire migration process:
1. Generates SQL migration using Drizzle Kit
2. Finds and copies the generated file
3. Automatically updates the migrations.ts manifest
4. Cleans up temporary files

### Usage

```bash
# 1. Edit the counter schema
vim src/counter-schema.ts

# 2. Run the automated migration script
pnpm counter:migrate
```

### What happens

```
🚀 Counter Durable Object Migration Generator

Step 1: Generating migration SQL with Drizzle Kit...
✓ Migration SQL generated

Step 2: Finding generated migration file...
✓ Found: 0000_brave_iron_man.sql

Step 3: Determining next migration number...
✓ Next migration: 0001_brave_iron_man.sql

Step 4: Copying migration to migrations directory...
✓ Copied to: .../0001_brave_iron_man.sql

Step 5: Updating migrations.ts manifest...
✓ Manifest updated

Step 6: Cleaning up generated files...
✓ Removed generated/ directory

✅ Migration created successfully!
```

### Output

- **New migration file**: `src/counter-migrations/000X_*.sql`
- **Updated manifest**: `src/counter-migrations/migrations.ts`

### Error Handling

The script will fail gracefully if:
- No schema changes detected (no migration needed)
- Migration generation fails
- File operations fail

### Manual Alternative

If you prefer manual control, use:

```bash
# Generate only (doesn't auto-copy or update manifest)
pnpm counter:generate
```

Then manually copy from `src/counter-migrations/generated/` and update `migrations.ts`.
