const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

console.log('🔍 Testing Supabase database setup...\n')

const tables = ['user_profiles', 'scans', 'reports', 'scan_logs', 'notifications', 'user_settings']

async function testDatabase() {
  let success = 0

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1)

      if (error) {
        console.log(`❌ ${table}: ${error.message}`)
      } else {
        console.log(`✅ ${table}: Table exists and accessible`)
        success++
      }
    } catch (e) {
      console.log(`❌ ${table}: ${e.message}`)
    }
  }

  console.log(`\n📊 Result: ${success}/${tables.length} tables ready`)

  if (success === tables.length) {
    console.log('🎉 Database setup complete!')
    console.log('✅ All tables created successfully')
    console.log('✅ Ready to start the Pentriarch AI application!')
  } else {
    console.log('⚠️ Some tables missing. Please check the SQL execution in Supabase.')
    console.log('💡 Make sure you used the supabase-schema-clean.sql file')
  }
}

testDatabase().catch(console.error)
