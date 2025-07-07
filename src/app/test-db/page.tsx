import { createClient } from '@/utils/supabase/server'

export default async function TestDatabase() {
  const supabase = createClient()

  // Test database tables
  const tables = ['user_profiles', 'scans', 'reports', 'scan_logs', 'notifications', 'user_settings']
  const results = []

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1)
      results.push({
        table,
        status: error ? 'error' : 'success',
        message: error?.message || 'Table accessible'
      })
    } catch (e) {
      results.push({
        table,
        status: 'error',
        message: e instanceof Error ? e.message : 'Unknown error'
      })
    }
  }

  const successCount = results.filter(r => r.status === 'success').length

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔍 Pentriarch AI Database Test</h1>

      <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
        <h2 className="text-xl font-semibold text-blue-800 mb-2">
          📊 Connection Status: {successCount}/{tables.length} tables ready
        </h2>
        {successCount === tables.length ? (
          <p className="text-green-600 font-semibold">
            🎉 All tables configured! Database ready for Pentriarch AI.
          </p>
        ) : (
          <p className="text-orange-600 font-semibold">
            ⚠️ Some tables missing. Please apply the database schema.
          </p>
        )}
      </div>

      <div className="grid gap-4">
        {results.map(({ table, status, message }) => (
          <div
            key={table}
            className={`p-4 rounded-lg border ${
              status === 'success'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">
                {status === 'success' ? '✅' : '❌'}
              </span>
              <span className="font-medium">{table}</span>
              <span className={`text-sm ${
                status === 'success' ? 'text-green-600' : 'text-red-600'
              }`}>
                {message}
              </span>
            </div>
          </div>
        ))}
      </div>

      {successCount < tables.length && (
        <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">
            📝 Setup Instructions:
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-yellow-700">
            <li>Open your Supabase project:
              <a
                href="https://povfmblwwtxqemqgomge.supabase.co/project/default/sql"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-blue-600 underline hover:text-blue-800"
              >
                SQL Editor
              </a>
            </li>
            <li>Copy the contents of: <code className="bg-yellow-100 px-2 py-1 rounded">supabase-schema-clean.sql</code></li>
            <li>Paste into SQL Editor and click "Run"</li>
            <li>Refresh this page to verify setup</li>
          </ol>
        </div>
      )}

      <div className="mt-8">
        <a
          href="/dashboard"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          ← Back to Dashboard
        </a>
      </div>
    </div>
  )
}
