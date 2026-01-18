const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🚀 Pentriarch AI - Supabase Connection Test\n')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.log('Required variables:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL')
  console.log('- SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

console.log('📝 Configuration:')
console.log(`   URL: ${supabaseUrl}`)
console.log(`   Service Key: ${supabaseServiceKey.substring(0, 20)}...`)

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testConnection() {
  console.log('\n🔍 Testing connection...')

  try {
    // Try to access a system table
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(10)

    if (error) {
      console.log('⚠️  System table access failed, trying user tables...')

      // Try checking for our specific tables
      const tables = ['user_profiles', 'scans', 'reports', 'scan_logs', 'notifications', 'user_settings']
      let existingTables = []

      for (const table of tables) {
        try {
          const { data: tableData, error: tableError } = await supabase
            .from(table)
            .select('*')
            .limit(1)

          if (!tableError) {
            existingTables.push(table)
          }
        } catch (e) {
          // Table doesn't exist, that's OK
        }
      }

      if (existingTables.length > 0) {
        console.log('✅ Connected to Supabase!')
        console.log(`📊 Found existing tables: ${existingTables.join(', ')}`)
        return existingTables
      } else {
        console.log('✅ Connected to Supabase!')
        console.log('📋 No application tables found - schema needs to be applied')
        return []
      }
    } else {
      console.log('✅ Connected to Supabase!')
      const publicTables = data.filter(t =>
        ['user_profiles', 'scans', 'reports', 'scan_logs', 'notifications', 'user_settings'].includes(t.table_name)
      )

      if (publicTables.length > 0) {
        console.log(`📊 Found ${publicTables.length} application tables`)
        console.log(`📋 Tables: ${publicTables.map(t => t.table_name).join(', ')}`)
      } else {
        console.log('📋 No application tables found - schema needs to be applied')
      }

      return publicTables.map(t => t.table_name)
    }

  } catch (error) {
    console.error('❌ Connection failed:', error.message)
    return false
  }
}

async function main() {
  const existingTables = await testConnection()

  if (existingTables === false) {
    console.log('\n❌ Cannot connect to Supabase. Please check your credentials.')
    process.exit(1)
  }

  const requiredTables = ['user_profiles', 'scans', 'reports', 'scan_logs', 'notifications', 'user_settings']
  const missingTables = requiredTables.filter(t => !existingTables.includes(t))

  if (missingTables.length === 0) {
    console.log('\n🎉 All required tables exist!')
    console.log('✅ Database is ready for the application')
  } else {
    console.log(`\n⚠️  Missing ${missingTables.length} tables: ${missingTables.join(', ')}`)
    console.log('\n📝 To setup the database:')
    console.log('1. Open: https://povfmblwwtxqemqgomge.supabase.co/project/default/sql')
    console.log('2. Copy the entire contents of: src/lib/supabase-schema.sql')
    console.log('3. Paste into the SQL Editor and click "Run"')
    console.log('4. Run this script again to verify')
  }
}

main().catch(console.error)
