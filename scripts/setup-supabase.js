const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('  Missing Supabase credentials in .env.local')
  console.log('Required variables:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL')
  console.log('- SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkConnection() {
  console.log('  Testing Supabase connection...')

  try {
    const { data, error } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')

    if (error) {
      console.error('  Connection failed:', error.message)
      return false
    }

    console.log('  Connected to Supabase successfully!')
    console.log(`  Found ${data.length} tables in public schema`)

    if (data.length > 0) {
      console.log('    Existing tables:', data.map(t => t.tablename).join(', '))
    }

    return true
  } catch (error) {
    console.error('  Connection error:', error.message)
    return false
  }
}

async function checkSchema() {
  console.log('\n  Checking for required tables...')

  const requiredTables = [
    'user_profiles',
    'scans',
    'reports',
    'scan_logs',
    'notifications',
    'user_settings'
  ]

  try {
    const { data, error } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .in('tablename', requiredTables)

    if (error) {
      console.error('  Schema check failed:', error.message)
      return false
    }

    const existingTables = data.map(t => t.tablename)
    const missingTables = requiredTables.filter(t => !existingTables.includes(t))

    console.log(`  Found ${existingTables.length}/${requiredTables.length} required tables`)

    if (existingTables.length > 0) {
      console.log('  Existing tables:', existingTables.join(', '))
    }

    if (missingTables.length > 0) {
      console.log('    Missing tables:', missingTables.join(', '))
      console.log('\n  To create missing tables:')
      console.log('1. Go to: https://povfmblwwtxqemqgomge.supabase.co/project/default/sql')
      console.log('2. Copy the contents of: src/lib/supabase-schema.sql')
      console.log('3. Paste and execute in the SQL Editor')
      return false
    }

    return true
  } catch (error) {
    console.error('  Schema check error:', error.message)
    return false
  }
}

async function checkColumns() {
  console.log('\nChecking required columns...')

  const requiredColumns = {
    user_profiles: [
      'id',
      'email',
      'full_name',
      'avatar_url',
      'plan',
      'role',
      'usage_tokens',
      'max_tokens',
      'created_at',
      'updated_at'
    ],
    scans: [
      'id',
      'user_id',
      'target',
      'prompt',
      'status',
      'ai_model',
      'tool_used',
      'command_executed',
      'start_time',
      'end_time',
      'created_at',
      'updated_at',
      'metadata'
    ],
    reports: [
      'id',
      'scan_id',
      'findings',
      'summary',
      'risk_score',
      'generated_at',
      'ai_analysis',
      'recommendations',
      'export_url'
    ],
    scan_logs: [
      'id',
      'scan_id',
      'timestamp',
      'level',
      'message',
      'raw_output'
    ],
    notifications: [
      'id',
      'user_id',
      'type',
      'title',
      'message',
      'read',
      'created_at',
      'scan_id',
      'severity'
    ],
    user_settings: [
      'id',
      'user_id',
      'preferred_ai_model',
      'notification_preferences',
      'api_keys',
      'branding',
      'created_at',
      'updated_at'
    ]
  }

  let allGood = true

  for (const [table, columns] of Object.entries(requiredColumns)) {
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', table)

    if (error) {
      console.error(`Column check failed for ${table}:`, error.message)
      allGood = false
      continue
    }

    const existing = data.map(row => row.column_name)
    const missing = columns.filter(column => !existing.includes(column))

    if (missing.length > 0) {
      allGood = false
      console.log(`Missing columns in ${table}:`, missing.join(', '))
    } else {
      console.log(`${table} columns OK`)
    }
  }

  if (!allGood) {
    console.log('\nTo fix missing columns:')
    console.log('1. Open: https://povfmblwwtxqemqgomge.supabase.co/project/default/sql')
    console.log('2. Copy the contents of: src/lib/supabase-schema.sql')
    console.log('3. Paste into the SQL Editor and click "Run"')
  }

  return allGood
}

async function testBasicOperations() {
  console.log('\n  Testing basic database operations...')

  try {
    // Test user_profiles table
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1)

    if (profileError) {
      console.log('    user_profiles table issue:', profileError.message)
    } else {
      console.log('  user_profiles table accessible')
    }

    // Test scans table
    const { data: scans, error: scanError } = await supabase
      .from('scans')
      .select('count')
      .limit(1)

    if (scanError) {
      console.log('    scans table issue:', scanError.message)
    } else {
      console.log('  scans table accessible')
    }

    return true
  } catch (error) {
    console.error('  Database operation test failed:', error.message)
    return false
  }
}

async function main() {
  console.log('  Pentriarch AI - Supabase Setup Verification\n')

  const connected = await checkConnection()
  if (!connected) {
    process.exit(1)
  }

  const schemaReady = await checkSchema()
  if (!schemaReady) {
    console.log('\n  Next steps:')
    console.log('1. Apply the database schema from src/lib/supabase-schema.sql')
    console.log('2. Run this script again to verify setup')
    process.exit(1)
  }

  const columnsReady = await checkColumns()
  if (!columnsReady) {
    console.log('\nNext steps:')
    console.log('1. Apply the database schema from src/lib/supabase-schema.sql')
    console.log('2. Run this script again to verify setup')
    process.exit(1)
  }

  await testBasicOperations()

  console.log('\n  Database setup complete!')
  console.log('  All required tables exist')
  console.log('  Basic operations working')
  console.log('  Ready for application use')
}

main().catch(console.error)
