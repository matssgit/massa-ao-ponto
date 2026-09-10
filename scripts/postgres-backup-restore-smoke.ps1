$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $true

$composeFile = Join-Path $PSScriptRoot "..\docker-compose.production-smoke.yml"
$restoreDatabase = "massa_restore"
$dumpPath = "/tmp/massa-backup-restore-proof.dump"
$schemaFingerprintQuery = "with objects(definition) as (select 'column|' || table_name || '|' || column_name || '|' || data_type || '|' || is_nullable || '|' || coalesce(column_default, '') from information_schema.columns where table_schema = 'public' union all select 'constraint|' || relation.relname || '|' || constraint_record.conname || '|' || pg_get_constraintdef(constraint_record.oid) from pg_constraint constraint_record join pg_class relation on relation.oid = constraint_record.conrelid join pg_namespace namespace_record on namespace_record.oid = relation.relnamespace where namespace_record.nspname = 'public' union all select 'index|' || tablename || '|' || indexname || '|' || indexdef from pg_indexes where schemaname = 'public' union all select 'enum|' || type_record.typname || '|' || enum_record.enumlabel || '|' || enum_record.enumsortorder::text from pg_type type_record join pg_enum enum_record on enum_record.enumtypid = type_record.oid join pg_namespace namespace_record on namespace_record.oid = type_record.typnamespace where namespace_record.nspname = 'public') select md5(string_agg(definition, E'\n' order by definition)) from objects;"

try {
  docker compose --file $composeFile up --build --detach --wait postgres
  docker compose --file $composeFile run --no-deps --build --rm migration

  docker compose --file $composeFile exec -T postgres psql --username smoke --dbname massa_smoke --set ON_ERROR_STOP=1 --command "insert into restaurants (name, address) values ('Backup proof fixture', 'Synthetic address');"
  docker compose --file $composeFile exec -T postgres pg_dump --username smoke --format custom --file $dumpPath massa_smoke
  docker compose --file $composeFile exec -T postgres dropdb --username smoke --if-exists $restoreDatabase
  docker compose --file $composeFile exec -T postgres createdb --username smoke $restoreDatabase
  docker compose --file $composeFile exec -T postgres pg_restore --username smoke --dbname $restoreDatabase --exit-on-error --no-owner --no-privileges $dumpPath

  $sourceTables = docker compose --file $composeFile exec -T postgres psql --username smoke --dbname massa_smoke --tuples-only --no-align --command "select count(*) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE';"
  $restoredTables = docker compose --file $composeFile exec -T postgres psql --username smoke --dbname $restoreDatabase --tuples-only --no-align --command "select count(*) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE';"
  $sourceMigrations = docker compose --file $composeFile exec -T postgres psql --username smoke --dbname massa_smoke --tuples-only --no-align --command "select count(*) from drizzle.__drizzle_migrations;"
  $restoredMigrations = docker compose --file $composeFile exec -T postgres psql --username smoke --dbname $restoreDatabase --tuples-only --no-align --command "select count(*) from drizzle.__drizzle_migrations;"
  $fixtureCount = docker compose --file $composeFile exec -T postgres psql --username smoke --dbname $restoreDatabase --tuples-only --no-align --command "select count(*) from restaurants where name = 'Backup proof fixture' and address = 'Synthetic address';"
  $sourceSchemaFingerprint = docker compose --file $composeFile exec -T postgres psql --username smoke --dbname massa_smoke --tuples-only --no-align --command $schemaFingerprintQuery
  $restoredSchemaFingerprint = docker compose --file $composeFile exec -T postgres psql --username smoke --dbname $restoreDatabase --tuples-only --no-align --command $schemaFingerprintQuery

  if ($sourceTables.Trim() -ne $restoredTables.Trim()) {
    throw "Restored public schema table count differs from source."
  }
  if ($sourceSchemaFingerprint.Trim() -ne $restoredSchemaFingerprint.Trim()) {
    throw "Restored schema definition differs from source."
  }
  if ($sourceMigrations.Trim() -ne "14" -or $restoredMigrations.Trim() -ne "14") {
    throw "Expected 14 Drizzle migrations in source and restored databases."
  }
  if ($fixtureCount.Trim() -ne "1") {
    throw "Synthetic fixture was not restored."
  }

  Write-Output "Backup/restore proof passed: schema, 14 migrations, and synthetic fixture restored."
} finally {
  docker compose --file $composeFile down --volumes --remove-orphans
}
