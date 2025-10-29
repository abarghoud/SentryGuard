# TypeORM Migrations Guide for Production

## 📋 Overview

This guide explains how to use TypeORM migrations for database schema management in production environments.

**Development vs Production:**
- **Development:** `synchronize: true` - automatic schema updates
- **Production:** `synchronize: false` - manual migrations required

---

## 🎯 Quick Start

### Development (Automatic)

The app is configured to auto-sync in development:

```bash
# Just start the app - schema updates automatically
nx serve api
```

✅ JWT columns (`jwt_token`, `jwt_expires_at`) will be created automatically

### Production (Migrations)

In production, you must run migrations manually:

```bash
# Navigate to API directory
cd apps/api

# Run pending migrations
npm run migration:run
```

---

## 🛠️ Migration Commands

### Run Migrations

```bash
cd apps/api
npm run migration:run
```

**What it does:**
- Connects to database
- Checks for pending migrations
- Executes them in order
- Records execution in `migrations` table

**Output:**
```
1 migrations are new migrations must be executed.
Migration AddJwtTokenToUser1761765785000 has been executed successfully.
```

### Show Migration Status

```bash
cd apps/api
npm run migration:show
```

**Shows:**
- Pending migrations (not yet run)
- Executed migrations (already run)

### Revert Last Migration

```bash
cd apps/api
npm run migration:revert
```

**Warning:** This will undo the last migration. Use with caution!

### Generate New Migration

When you change entity files:

```bash
cd apps/api
npm run migration:generate -- src/migrations/MigrationName
```

**Example:**
```bash
npm run migration:generate -- src/migrations/AddUserFields
```

This will:
- Compare entities with database
- Generate migration file with changes
- Save to `src/migrations/`

### Create Empty Migration

For custom SQL:

```bash
cd apps/api
npm run migration:create -- src/migrations/CustomMigration
```

---

## 📁 Migration Files

### Location

```
apps/api/src/migrations/
└── 1761765785000-AddJwtTokenToUser.ts
```

### Example Migration

```typescript
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddJwtTokenToUser1761765785000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add jwt_token column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'jwt_token',
        type: 'text',
        isNullable: true,
      })
    );

    // Add jwt_expires_at column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'jwt_expires_at',
        type: 'timestamp',
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop jwt_expires_at column
    await queryRunner.dropColumn('users', 'jwt_expires_at');

    // Drop jwt_token column
    await queryRunner.dropColumn('users', 'jwt_token');
  }
}
```

---

## ⚙️ Configuration

### Development Configuration

**File:** `apps/api/src/config/database.config.ts`

```typescript
export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    // ...
    synchronize: !isProduction,  // Auto in dev, manual in prod
    migrationsRun: isProduction, // Auto-run in production
    migrations: ['dist/migrations/*.js'],
    // ...
  };
};
```

### Migration CLI Configuration

**File:** `apps/api/src/config/database.config.ts`

This file contains both the NestJS configuration and the TypeORM CLI configuration:

```typescript
import { DataSource, DataSourceOptions } from 'typeorm';

// DataSource options for TypeORM CLI
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'teslaguard',
  password: process.env.DATABASE_PASSWORD || 'teslaguard',
  database: process.env.DATABASE_NAME || 'teslaguard',
  entities: ['src/entities/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
};

// Default export for TypeORM CLI
const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
```

**Note:** This is the same file used by the NestJS application, providing a single source of truth for database configuration.

---

## 🚀 Production Deployment Workflow

### Step 1: Prepare Migrations Locally

```bash
# 1. Make entity changes
# Edit apps/api/src/entities/user.entity.ts

# 2. Generate migration
cd apps/api
npm run migration:generate -- src/migrations/YourMigrationName

# 3. Review generated migration
# Check src/migrations/TIMESTAMP-YourMigrationName.ts

# 4. Test migration locally
npm run migration:run

# 5. Verify database schema
psql -d teslaguard -c "\d users"

# 6. Commit migration file
git add src/migrations/
git commit -m "Add migration: YourMigrationName"
```

### Step 2: Deploy to Production

```bash
# 1. Build application
nx build api

# 2. Copy files to production server
# (migrations are in dist/migrations/)

# 3. On production server:
cd /path/to/production/apps/api

# 4. Set production environment
export NODE_ENV=production

# 5. Run migrations
npm run migration:run

# 6. Start application
# Migrations will auto-run on startup (migrationsRun: true)
npm start
```

---

## 🔐 Environment Variables

### Development

```env
NODE_ENV=development
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=teslaguard
DATABASE_PASSWORD=teslaguard
DATABASE_NAME=teslaguard
DATABASE_LOGGING=false
```

### Production

```env
NODE_ENV=production
DATABASE_HOST=your-prod-db-host
DATABASE_PORT=5432
DATABASE_USER=your-prod-user
DATABASE_PASSWORD=your-secure-password
DATABASE_NAME=teslaguard_prod
DATABASE_SSL=true
DATABASE_LOGGING=false
```

---

## 🐛 Troubleshooting

### "Unable to compile TypeScript"

**Cause:** TypeScript configuration issues

**Solution:**
```bash
# Check tsconfig.typeorm.json exists
ls apps/api/tsconfig.typeorm.json

# Verify it has correct settings
cat apps/api/tsconfig.typeorm.json
```

### "No pending migrations"

**Cause:** Migration already ran or no migration files found

**Solution:**
```bash
# Check migration status
npm run migration:show

# Check migration files exist
ls src/migrations/
```

### "Migration table doesn't exist"

**Cause:** First time running migrations

**Solution:** Normal - TypeORM will create the table automatically

### "Connection refused"

**Cause:** Database not running or wrong credentials

**Solution:**
```bash
# Check database is running
psql -h localhost -U teslaguard -d teslaguard -c "SELECT 1;"

# Verify environment variables
echo $DATABASE_HOST
echo $DATABASE_NAME
```

### "Column already exists"

**Cause:** Migration ran outside of TypeORM or synchronize was on

**Solution:**
```bash
# Option 1: Mark migration as executed
npm run migration:run -- --fake

# Option 2: Revert and re-run
# WARNING: Data loss possible
npm run migration:revert
npm run migration:run
```

---

## 📊 Migration Best Practices

### 1. Always Review Generated Migrations

```bash
# Generate migration
npm run migration:generate -- src/migrations/AddField

# Review the file BEFORE running
cat src/migrations/*-AddField.ts

# Make sure:
# - Correct table and columns
# - Proper data types
# - No accidental drops
```

### 2. Test Migrations Locally First

```bash
# Fresh database for testing
createdb teslaguard_test

# Point to test database
export DATABASE_NAME=teslaguard_test

# Run migration
npm run migration:run

# Verify schema
psql -d teslaguard_test -c "\d users"

# Test rollback
npm run migration:revert
```

### 3. Never Edit Executed Migrations

❌ **Don't do this:**
```typescript
// Editing already-executed migration
export class AddUserField1234567890 {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Changed after deployment - BAD!
    await queryRunner.addColumn('users', ...);
  }
}
```

✅ **Do this instead:**
```bash
# Create new migration for changes
npm run migration:generate -- src/migrations/FixUserField
```

### 4. Handle Data Migrations Carefully

```typescript
export class MigrateUserData1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add new column
    await queryRunner.addColumn('users', new TableColumn({
      name: 'new_field',
      type: 'varchar',
      isNullable: true, // Nullable during migration
    }));

    // 2. Migrate data
    await queryRunner.query(`
      UPDATE users 
      SET new_field = old_field 
      WHERE old_field IS NOT NULL
    `);

    // 3. Make non-nullable (if needed)
    await queryRunner.changeColumn('users', 'new_field', new TableColumn({
      name: 'new_field',
      type: 'varchar',
      isNullable: false,
    }));

    // 4. Drop old column
    await queryRunner.dropColumn('users', 'old_field');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse the process
    // ...
  }
}
```

### 5. Use Transactions

```typescript
export class ComplexMigration1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // TypeORM wraps migrations in transactions by default
    // All changes succeed or all fail

    await queryRunner.addColumn(...);
    await queryRunner.query(...);
    // If any fails, everything rolls back
  }
}
```

---

## 🔍 Debugging Migrations

### Enable Logging

```env
DATABASE_LOGGING=true
```

**Output:**
```
query: ALTER TABLE "users" ADD "jwt_token" text
query: ALTER TABLE "users" ADD "jwt_expires_at" timestamp
```

### Check Migration Table

```sql
-- See all executed migrations
SELECT * FROM migrations ORDER BY id DESC;

-- Result:
-- id | timestamp     | name
-- 1  | 1761765785000 | AddJwtTokenToUser1761765785000
```

### Verify Column Creation

```sql
-- Check users table structure
\d users

-- Or
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('jwt_token', 'jwt_expires_at');
```

---

## 📚 Common Scenarios

### Scenario 1: Add New Column

```bash
# 1. Edit entity
# Add to apps/api/src/entities/user.entity.ts:
# @Column({ nullable: true })
# newField?: string;

# 2. Generate migration
cd apps/api
npm run migration:generate -- src/migrations/AddNewField

# 3. Run migration
npm run migration:run
```

### Scenario 2: Modify Existing Column

```bash
# 1. Edit entity (change type or constraints)

# 2. Generate migration
npm run migration:generate -- src/migrations/ModifyColumn

# 3. Review migration carefully!
cat src/migrations/*-ModifyColumn.ts

# 4. Run migration
npm run migration:run
```

### Scenario 3: Add Index

```bash
# 1. Add to entity:
# @Index()
# @Column()
# email: string;

# 2. Generate migration
npm run migration:generate -- src/migrations/AddEmailIndex

# 3. Run migration
npm run migration:run
```

### Scenario 4: Drop Column (Dangerous!)

```bash
# 1. Remove from entity

# 2. Generate migration
npm run migration:generate -- src/migrations/DropOldColumn

# 3. BACKUP DATABASE FIRST!
pg_dump teslaguard > backup.sql

# 4. Review migration
cat src/migrations/*-DropOldColumn.ts

# 5. Run migration
npm run migration:run
```

---

## 🎯 Checklist for Production

Before deploying migrations to production:

- [ ] Migration tested locally
- [ ] Migration reviewed and approved
- [ ] Database backup created
- [ ] Migration runs successfully on staging
- [ ] Rollback plan documented
- [ ] Downtime window scheduled (if needed)
- [ ] Team notified
- [ ] Monitoring in place

**Deployment Steps:**

```bash
# 1. Backup production database
pg_dump -h prod-host -U user teslaguard > prod_backup_$(date +%Y%m%d).sql

# 2. Run migration
cd apps/api
NODE_ENV=production npm run migration:run

# 3. Verify schema
psql -h prod-host -U user -d teslaguard -c "\d users"

# 4. Start application
npm start

# 5. Monitor logs
tail -f /var/log/app.log
```

---

## 📞 Support

For issues:

1. Check this guide
2. Check TypeORM documentation: https://typeorm.io/migrations
3. Review migration logs
4. Check database logs

**Emergency Rollback:**

```bash
# Revert last migration
npm run migration:revert

# Restore from backup
psql -h host -U user -d teslaguard < backup.sql
```

---

**Last Updated:** 2025  
**Version:** 1.0.0  
**Status:** Production Ready