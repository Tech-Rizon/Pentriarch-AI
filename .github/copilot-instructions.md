# Pentriarch AI - Copilot Instructions

This document guides AI agents working on the Pentriarch AI codebase—an advanced penetration testing platform combining Next.js, Supabase, Docker tool execution, and multi-model AI orchestration.

## Architecture Overview

### Core Stack
- **Next.js 15** (App Router) with TypeScript
- **Supabase** (Auth, DB, Realtime) for user & scan management
- **Docker + Dockerode** to isolate and execute security tools safely
- **Multi-model AI routing** (OpenAI, Anthropic, DeepSeek, Llama) via MCPRouter
- **Tailwind CSS + shadcn/ui** for responsive dark-mode dashboard UI

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER (Browser)                          │
│  React 19 + Next.js 15 App Router  │  shadcn/ui Components             │
│  useWebSocket Hook (real-time)     │  ChatKitConsole (OpenAI widget)   │
└──────────────────────┬──────────────────────────────────────────────────┘
                       │
                       ↓ HTTP + WebSocket
┌──────────────────────────────────────────────────────────────────────────┐
│                      MIDDLEWARE LAYER                                    │
│  middleware.ts: Route protection, role-based auth, session refresh      │
│  PUBLIC_ROUTES: /, /auth, /docs, /privacy                              │
│  ROLE_PROTECTED_ROUTES: /admin, /dashboard, /settings                  │
└──────────────────────┬──────────────────────────────────────────────────┘
                       │
                       ↓ NextRequest
┌──────────────────────────────────────────────────────────────────────────┐
│                     API ROUTES (Next.js Edge/Node)                      │
│  /api/scan (POST)         → Core scan execution orchestrator            │
│  /api/ai-analysis (POST)  → Post-scan intelligent analysis              │
│  /api/settings (GET/POST) → User preferences & API key mgmt            │
│  /api/status/:id (GET)    → Real-time scan status & logs               │
│  /api/audit (GET/POST)    → Compliance logging                         │
│  /api/admin/stats (GET)   → System metrics dashboard                   │
└──────────────────────┬──────────────────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┬─────────────┐
         ↓             ↓             ↓             ↓
   ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ Authentication  │ Entitlements    │ Tool Selection  │ Model Routing
   │ getCurrentUser │ requireEntitle  │ toolsRouter     │ MCPRouter
   │   Server()    │   ment()        │                 │
   └────────────┘ └──────────┘ └──────────┘ └──────────┘
         │             │             │             │
         └─────────────┴─────────────┴─────────────┘
                       ↓
    ┌──────────────────────────────────────────┐
    │    ORCHESTRATION LAYER                   │
    │  agentWorkflow.ts:                       │
    │  - OpenAI Agents plan tool selection    │
    │  - Returns JSON { tool, flags, target }│
    │  - Falls back to MCPRouter if needed    │
    └──────────────────────────────────────────┘
                       ↓
    ┌──────────────────────────────────────────┐
    │    EXECUTION LAYER                       │
    │  dockerManager.ts:                       │
    │  - Spawns isolated Docker containers    │
    │  - Real-time stdout/stderr streaming    │
    │  - Container lifecycle management       │
    │  - Timeout enforcement (per-tool)       │
    └──────────────────────────────────────────┘
                       ↓
    ┌──────────────────────────────────────────┐
    │    REAL-TIME STREAMING                   │
    │  websocket.ts:                           │
    │  - WebSocketManager (browser + server)   │
    │  - Broadcast scan progress               │
    │  - Fallback to polling if no WS support │
    └──────────────────────────────────────────┘
                       ↓
    ┌──────────────────────────────────────────┐
    │    DATA PERSISTENCE                      │
    │  Supabase (PostgreSQL):                  │
    │  - scans (request metadata)              │
    │  - scan_logs (real-time output)          │
    │  - reports (analysis results)            │
    │  - user_profiles (auth + entitlements)  │
    │  - projects, targets (scan scope)       │
    └──────────────────────────────────────────┘
```

### Complete Data Flow

1. **User initiates scan** (Browser) → ScanConfigurationModal captures target + prompt
2. **POST /api/scan** → Validates user authentication + authorization
3. **Entitlement check** → Ensures user plan allows requested scan type
4. **Target whitelist check** → Validates against ALLOWED_SCAN_TARGETS env var
5. **AI model selection** → MCPRouter.selectOptimalModel() considers:
   - Prompt complexity (analyzePromptComplexity)
   - User plan restrictions (free/pro/enterprise)
   - User's preferred model (from user_profiles)
   - Model availability (API keys configured)
6. **AI-powered tool planning** → AgentWorkflow (OpenAI Agents SDK):
   - Sends system prompt + user request to gpt-4.1
   - Returns JSON: { tool, flags, reasoning, confidence, risk_assessment }
7. **Tool validation** → ToolsRouter checks:
   - Tool exists in SECURITY_TOOLS array
   - User has entitlements for tool's risk_level
   - Tool hasn't exceeded daily usage quota
8. **Scan record creation** → insertScanServer() stores in `scans` table:
   - user_id, target, prompt, status='queued', ai_model selected
9. **Docker container spawn** → dockerManager.executeScan():
   - Detects tool name from command (nmap, nikto, sqlmap, etc.)
   - Looks up TOOL_IMAGES[tool] → Docker image reference
   - Spawns: `docker run --rm --cpus=0.5 --memory=512m <image> <baseArgs> <userFlags> <target>`
   - Enforces max_execution_time timeout (300-1200 seconds per tool)
10. **Real-time output streaming** → As tool executes:
    - stdout/stderr piped to insertScanLogServer() (stores in scan_logs table)
    - broadcasterScanProgress() publishes via WebSocket to browser
    - Client-side useWebSocket hook updates UI in real-time
11. **Scan completion** → updateScanStatusServer(scanId, 'completed', {output, results})
12. **AI post-analysis** → User requests POST /api/ai-analysis:
    - Retrieves scan logs, parses tool output
    - MCPRouter analyzes findings for vulnerabilities
    - Generates human-readable remediation suggestions
    - Stores in reports table

## Key Files & Responsibilities

### Authentication & User Management
- `middleware.ts`: Route protection, role-based access (admin/user/guest)
- `src/lib/supabase.ts`: Supabase client, server auth, user profile sync
- `src/app/api/settings/route.ts`: User preferences, API key validation

### Scan Execution Pipeline
- `src/app/api/scan/route.ts`: **Core endpoint**—validates target, checks entitlements, triggers workflow
- `src/lib/agentWorkflow.ts`: OpenAI Agents-based planning (selects tool + flags)
- `src/lib/toolsRouter.ts`: Defines 100+ security tools (nmap, nikto, sqlmap, etc.) with risk levels & default flags
- `src/lib/dockerManager.ts`: Spawns/manages Docker containers, streams output to WebSocket

### AI Model Management
- `src/lib/mcpRouter.ts`: **Model Control Protocol**—defines AI_MODELS array, loads API keys, selects best model for task
- `src/app/api/ai-analysis/route.ts`: Post-scan intelligent analysis & remediation suggestions
- `src/app/api/set-model/route.ts`: User-configurable default model

### Admin & Monitoring
- `src/app/api/admin/stats/route.ts`: Dashboard metrics (user count, scan stats, Docker health)
- `src/app/api/audit/route.ts`: Compliance logging with scan_logs table joins

## Critical Patterns

### 1. Authentication & Authorization Flow

All server-side operations follow this multi-layer security pattern:

```typescript
// Step 1: Extract user from request (session token validation)
export async function POST(request: NextRequest) {
  const user = await getCurrentUserServer(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  // Step 2: Verify resource ownership (prevent accessing other users' scans)
  const scan = await getScanByIdServer(scanId)
  if (scan.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  
  // Step 3: Check entitlements (free/pro/enterprise plan restrictions)
  const entitlementResult = await requireEntitlement({
    userId: user.id,
    targetId,
    scanType: 'advanced_web_scan'
  })
  if (!entitlementResult.ok) return NextResponse.json({ error: entitlementResult.reason }, { status: 403 })
  
  // Step 4: Process with scan data
  const scanLogs = await getScanLogsServer(scanId)
}
```

**Key Functions (all in `src/lib/supabase.ts`):**
- `getCurrentUserServer(request?: NextRequest)` - Extracts Supabase auth user from request cookies
- `getScanByIdServer(scanId)` - Fetch scan + verify it exists
- `getScanLogsServer(scanId)` - Fetch streaming logs for completed/running scans
- `insertScanServer(scan)` - Create new scan record in `scans` table
- `updateScanStatusServer(scanId, status, metadata)` - Update scan status (queued → running → completed/failed)

### 2. Entitlement-Based Access Control (Fine-Grained Plan Logic)

`src/lib/policy/entitlementMiddleware.ts` enforces plan-based feature access:

```typescript
const PLAN_SCAN_TYPES: Record<'free' | 'pro' | 'enterprise', string[]> = {
  free: ['headers_tls'],                          // Basic headers/TLS check
  pro: ['headers_tls', 'passive_web'],            // + Web app scanning
  enterprise: ['headers_tls', 'passive_web']      // All features
}

export const requireEntitlement = async ({ userId, targetId, scanType }) => {
  const entitlement = await getEntitlementForUser(userId)
  
  // Check 1: Does user's plan allow this scan type?
  if (!entitlement.allowedScanTypes.includes(scanType)) {
    return { ok: false, reason: 'Scan type not allowed for current plan', entitlement }
  }
  
  // Check 2: Does user own the target?
  const target = await getTargetByIdServer(targetId)
  const project = await getProjectByIdServer(target.project_id)
  if (project.owner_id !== userId) {
    return { ok: false, reason: 'Target is not owned by this account', entitlement }
  }
  
  // Check 3: Is active scanning enabled on target?
  if (!target.active_scans_allowed) {
    return { ok: false, reason: 'Target is not enabled for active scans', entitlement }
  }
  
  return { ok: true, entitlement, target }
}
```

**Entitlements are loaded from user_profiles table:**
```sql
user_profiles:
  id (uuid, FK → auth.users)
  plan: 'free' | 'pro' | 'enterprise'
  email
  full_name
```

### 3. AI Model Selection & Routing (MCPRouter)

`src/lib/mcpRouter.ts` implements intelligent model selection with automatic fallback:

**AI_MODELS array** defines 7 models across 4 providers:
- **OpenAI**: gpt-4, gpt-4-mini (reasoning/accuracy focus)
- **Anthropic**: claude-3-sonnet, claude-3-haiku (safety/compliance focus)
- **DeepSeek**: deepseek-v2 (cost-optimized technical analysis)
- **Llama**: llama-3.1-70b-instruct, llama-3.1-8b-instruct (open-source alternatives)

**Selection algorithm:**
```typescript
selectOptimalModel(prompt, preferredModel?, userPlan = 'free') {
  // 1. Filter by user plan
  let availableModels = AI_MODELS.filter(m => m.available)
  if (userPlan === 'free') {
    availableModels = availableModels.filter(m => 
      ['gpt-4-mini', 'claude-3-haiku'].includes(m.id)
    )
  }
  
  // 2. Use user's preferred model if set
  if (preferredModel) {
    const preferred = availableModels.find(m => m.id === preferredModel)
    if (preferred) return { id: preferred.id, name: preferred.name, reasoning: 'User preference' }
  }
  
  // 3. Analyze prompt complexity (word count, keywords)
  const complexity = this.analyzePromptComplexity(prompt)  // 0-1 score
  
  // 4. Extract requirements (reasoning, code, security)
  const requirements = this.extractRequirements(prompt)
  
  // 5. Score each model: (latency, accuracy, cost) weighted by complexity
  const scored = availableModels.map(m => ({
    model: m,
    score: this.scoreModel(m, complexity, requirements, userPlan)
  })).sort((a, b) => b.score - a.score)
  
  return { id: scored[0].model.id, name: scored[0].model.name, confidence: 0.95 }
}
```

**Fallback order (if primary fails):**
```typescript
fallbackOrder = ['gpt-4-mini', 'claude-3-haiku', 'llama-3.1-8b-instruct', 'deepseek-v2']
```

**API Key Loading:**
- MCPRouter loads keys from environment on construction
- Missing keys → model marked as unavailable
- executePrompt() catches errors and tries next fallback automatically

### 4. Tool Execution Safety & Docker Isolation

`src/lib/toolsRouter.ts` defines 100+ security tools with safety constraints:

```typescript
export interface SecurityTool {
  id: string
  name: string
  category: 'reconnaissance' | 'scanning' | 'exploitation' | 'web-application' | ...
  risk_level: 'low' | 'medium' | 'high' | 'critical'  // ← Enforced by entitlements
  requires_auth: boolean                               // ← User must confirm target ownership
  default_flags: string[]                              // ← Safe baseline arguments
  max_execution_time: number                           // ← Timeout in seconds (300-1200)
  output_format: 'text' | 'json' | 'xml' | 'csv'
  documentation: string
}
```

**Tool categories & examples:**
- reconnaissance: nmap, masscan, zmap (host/port discovery)
- web-application: nikto, gobuster, whatweb, sqlmap, wpscan (web app testing)
- network: tcpdump, arp-scan (network analysis)
- password: hashcat, john (offline password cracking)
- wireless: aircrack, wifite (WiFi testing)
- cloud: AWS CLI, Azure CLI (cloud asset enumeration)

**Docker Execution Flow:**

```typescript
// dockerManager.ts - executeScan()
private async realExecution(scanId: string, command: string, userId: string) {
  // 1. Detect tool from command string
  const tool = detectTool(command)  // "nmap -sV -T4 target" → tool="nmap"
  if (!TOOL_IMAGES[tool]) throw new Error("Unsupported command")
  
  // 2. Tokenize command into args
  const tokens = tokenize(command)  // ["nmap", "-sV", "-T4", "target"]
  const finalArgs = tokens.slice(1)
  
  // 3. Prepare Docker run arguments
  const dockerArgs = [
    'run', '--rm',
    '--cpus=0.5',        // CPU limit
    '--memory=512m',     // Memory limit
    TOOL_IMAGES[tool].image,      // e.g., "kalilinux/kali:latest"
    ...TOOL_IMAGES[tool].baseArgs, // e.g., ["nmap"]
    ...finalArgs                   // user flags + target
  ]
  
  // 4. Spawn Docker process
  const child = spawn('docker', dockerArgs)  // On Windows: 'docker.exe'
  
  // 5. Stream stdout/stderr in real-time
  child.stdout.on('data', (d) => {
    const text = d.toString()
    // → insertScanLogServer(scan_id, level='info', raw_output=text)
    // → broadcastScanProgress(scanId, userId, { output: text })
  })
  
  // 6. Enforce timeout
  const killAfterMs = tool_max_execution_time || 600000
  const timeout = setTimeout(() => {
    child.kill('SIGKILL')  // Force kill after timeout
  }, killAfterMs)
  
  // 7. Wait for completion
  return new Promise((resolve, reject) => {
    child.on('exit', (code) => {
      clearTimeout(timeout)
      resolve({ success: code === 0, output, error: stderr })
    })
  })
}
```

**Key points:**
- All execution happens in isolated Docker container
- Docker image specified in `src/lib/toolImages.ts`
- Tool binary + base flags prepended (nmap → ["nmap", "-sV", "-sC", ...userFlags])
- stdout/stderr captured and streamed to WebSocket in real-time
- Container killed forcefully if timeout exceeded
- Logs persisted in scan_logs table for audit trail

### 5. Real-Time WebSocket Streaming

`src/lib/websocket.ts` implements browser-server real-time updates:

**Server-side broadcast:**
```typescript
// From dockerManager.ts while container is running
this.broadcaster.broadcastScanProgress(scanId, userId, {
  scanId,
  status: 'running',
  progress: 50,           // 0-100
  currentStep: 'Streaming output',
  output: '<latest tool output>',
  estimatedTimeRemaining: 120
})
```

**Client-side subscription (React hook):**
```typescript
// useWebSocket.ts
const { isConnected, sendMessage, subscribeScan } = useWebSocket({
  userId,
  onScanProgress: (progress) => {
    // Update UI as tool runs
    setProgress(progress.progress)
    setOutput(prev => prev + progress.output)
  },
  onScanComplete: (result) => {
    // Scan finished
    setStatus('completed')
  },
  onScanError: (error) => {
    // Container killed or timeout
    setStatus('failed')
  }
})

// Subscribe to specific scan
useEffect(() => {
  subscribeScan(scanId)
}, [scanId])
```

**Architecture:**
- Browser → useWebSocket hook (handles connection + message routing)
- Server → webSocketManager broadcasts to all connected users
- Fallback: If no WS support, polls /api/status/:scanId every 1-2 seconds
- Message types: scan_progress, container_status, notification, scan_complete, scan_error

### 6. Agent Workflow (OpenAI Agents SDK)

`src/lib/agentWorkflow.ts` uses OpenAI Agents for intelligent tool planning:

```typescript
const scanPlanner = new Agent({
  name: 'Pentriarch Scan Planner',
  instructions: [
    'You are a professional penetration testing assistant.',
    'Pick the safest and most appropriate single tool for the user request.',
    'Available tools: nmap, nikto, sqlmap, wpscan, gobuster, whatweb, masscan.',
    'Only suggest sqlmap if there is a clear indication of SQL injection testing.',
    'Return ONLY a single JSON object with keys:',
    'tool, target, reasoning, confidence, flags, estimated_time, risk_assessment.'
  ].join(' '),
  model: 'gpt-4.1'
})

export const runAgentWorkflow = async ({ prompt, target, userId, userPlan }) => {
  const runner = new Runner({ traceMetadata: { user_id: userId } })
  const result = await runner.run(scanPlanner, [
    {
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: `User request: ${prompt}\nTarget: ${target}\nUser plan: ${userPlan}`
        }
      ]
    }
  ])
  
  return { response: result.finalOutput, model: 'gpt-4.1' }
}
```

**Key points:**
- Agent runs with temperature=0.2 (deterministic)
- Returns JSON parseable by parseAIResponse()
- Falls back to MCPRouter if agent fails
- Respects AGENT_WORKFLOW_ENABLED env flag

### 7. Environment Variable Strategy

**Public (client-accessible) — prefix `NEXT_PUBLIC_`:**
```
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_CHATKIT_ENABLED=true|false
```

**Server-only (Node.js API routes):**
```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=sk-...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  (admin operations)
AGENT_MODEL=gpt-4.1                   (OpenAI Agents model)
AGENT_WORKFLOW_ENABLED=true|false
ALLOWED_SCAN_TARGETS=localhost,192.168.1.*,example.com  (whitelist)
REAL_EXECUTION=true|false             (toggle Docker execution)
CHATKIT_WORKFLOW_ID=...               (optional ChatKit integration)
LLAMA_STACK_API_KEY=...               (if using Llama models)
```

### 8. Error Handling & HTTP Status Codes

All API responses use `NextResponse.json()` with proper status codes:

```typescript
// 400 Bad Request: Invalid input validation
return NextResponse.json({ error: 'Invalid target format' }, { status: 400 })

// 401 Unauthorized: User not authenticated
return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// 403 Forbidden: User lacks permission (wrong scan owner, entitlement denied)
return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

// 404 Not Found: Scan/resource doesn't exist
return NextResponse.json({ error: 'Scan not found' }, { status: 404 })

// 500 Internal Server Error: AI, Docker, or DB failure
console.error('Critical error:', error)
return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
```

**Common patterns:**
```typescript
// Combine multiple checks
if (!user || !user.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// Include details for debugging
if (!scan) return NextResponse.json({ 
  error: 'Scan not found', 
  details: `scanId=${scanId}` 
}, { status: 404 })

// Fallback error handling
try {
  const result = await mcpRouter.executePrompt(prompt, modelId)
} catch (error) {
  console.error('AI analysis failed:', error)
  return NextResponse.json({ 
    error: 'AI analysis temporarily unavailable',
    message: error instanceof Error ? error.message : 'Unknown error'
  }, { status: 500 })
}
```

## Database Schema & Table Relationships

### Core Tables in Supabase PostgreSQL

**auth.users** (Supabase managed)
```sql
-- Managed by Supabase Auth
id: uuid (primary key)
email: text (unique)
created_at: timestamp
last_sign_in_at: timestamp
user_metadata: jsonb { role: 'admin'|'user'|'guest', full_name: string, ... }
```

**user_profiles** (Extended user metadata)
```sql
id: uuid (FK → auth.users, primary key)
email: text
full_name: text
plan: 'free' | 'pro' | 'enterprise'  -- Controls entitlements
preferred_ai_model: text              -- User's default AI model
notification_preferences: jsonb       -- Email/browser toggle
api_keys: jsonb { openai?, anthropic?, deepseek? }  -- Optional user overrides
created_at: timestamp
updated_at: timestamp
```

**scans** (Core scan metadata)
```sql
id: uuid (primary key)
user_id: uuid (FK → auth.users)  -- Who initiated scan
target: text                      -- IP/domain being scanned
prompt: text                      -- User's natural language request
ai_model: text                    -- Which model was used (gpt-4, claude-3-sonnet, etc.)
tool_used: text                   -- Detected tool (nmap, nikto, sqlmap)
command_executed: text            -- Full CLI command that ran
status: 'queued' | 'running' | 'completed' | 'failed'
start_time: timestamp
end_time: timestamp
output: text                      -- Full tool output
metadata: jsonb                   -- Extra data (Docker image, errors, etc.)
created_at: timestamp
updated_at: timestamp
```

**scan_logs** (Real-time streaming logs)
```sql
id: uuid (primary key)
scan_id: uuid (FK → scans)
timestamp: timestamp
level: 'info' | 'warning' | 'error' | 'debug'
message: text                     -- Human-readable message
raw_output: text                  -- Exact tool output line
created_at: timestamp
```
Purpose: Enables real-time WebSocket streaming as tool executes. Rows inserted as Docker outputs data. Queried by `/api/status/:id` and WebSocket broadcaster.

**reports** (Post-analysis AI findings)
```sql
id: uuid (primary key)
scan_id: uuid (FK → scans)
findings: jsonb [
  {
    id: string,
    title: string,
    description: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    cve_refs?: string[],
    cwe_refs?: string[],
    recommendation: string,
    evidence?: string,
    affected_urls?: string[]
  }
]
summary: text                     -- Executive summary
risk_score: float (0-100)        -- Overall vulnerability score
ai_analysis: text                 -- Claude/GPT analysis
recommendations: text[]           -- Remediation steps
export_url?: text                 -- Signed download link
generated_at: timestamp
```

**projects** (Scan scope & organizational)
```sql
id: uuid (primary key)
owner_id: uuid (FK → auth.users)
name: text
created_at: timestamp
```
Purpose: Group targets logically (e.g., "Production Infrastructure", "Customer Websites")

**targets** (Scan targets with verification)
```sql
id: uuid (primary key)
project_id: uuid (FK → projects)
base_url: text                   -- http://example.com
host: text                       -- example.com
verified: boolean                -- Owner confirmed permission
active_scans_allowed: boolean    -- Can run scans on this target?
scope: jsonb {
  allowedPathPrefixes: string[],    -- /api/*, /admin/*
  excludedPathPrefixes: string[],   -- /internal/*, /private/*
  maxRequestsPerMinute: number,
  maxConcurrency: number
}
created_at: timestamp
```

**target_verification** (OAuth-style domain verification)
```sql
id: uuid (primary key)
target_id: uuid (FK → targets)
method: 'well_known' | 'dns_txt' | 'loa'
token: string                    -- Verification code user places in domain
status: 'pending' | 'verified' | 'failed'
verified_at: timestamp
created_at: timestamp
```

**notifications** (User alerts)
```sql
id: uuid (primary key)
user_id: uuid (FK → auth.users)
type: 'scan_complete' | 'vulnerability_found' | 'system_alert' | 'ai_fallback'
title: text
message: text
read: boolean
scan_id: uuid? (FK → scans)       -- Link back to triggering scan
severity: 'low' | 'medium' | 'high' | 'critical'?
created_at: timestamp
```

### Key Table Relationships

```
auth.users ──┬──→ user_profiles (1:1)      [auth & preferences]
             ├──→ projects (1:N)           [ownership]
             ├──→ scans (1:N)              [scan history]
             └──→ notifications (1:N)      [alerts]

projects ────→ targets (1:N)               [scan scope]
targets ──────→ target_verification (1:N) [ownership proof]

scans ────────┬──→ scan_logs (1:N)         [streaming output]
              └──→ reports (1:1)           [post-analysis]
```

### Typical Query Patterns

**Get user's recent scans:**
```typescript
const scans = await supabaseServer
  .from('scans')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(50)
```

**Stream logs as scan runs:**
```typescript
// Called by /api/status/:id to fetch real-time logs
const logs = await supabaseServer
  .from('scan_logs')
  .select('*')
  .eq('scan_id', scanId)
  .order('timestamp', { ascending: true })

// WebSocket broadcasts each new log row as it's inserted
```

**Get analysis report for a scan:**
```typescript
const report = await supabaseServer
  .from('reports')
  .select('*')
  .eq('scan_id', scanId)
  .single()
```

## Request/Response Flow Examples

### Example 1: Complete Scan Execution Flow

```typescript
// 1. BROWSER: User clicks "Start Scan"
POST /api/scan {
  target: "example.com",
  prompt: "Run a comprehensive port scan",
  authorizationConfirmed: true
}

// 2. API ROUTE: /app/api/scan/route.ts
export async function POST(request: NextRequest) {
  // Step A: Auth check
  const user = await getCurrentUserServer(request)  // JWT from cookies
  
  // Step B: Validate target format & whitelist
  if (!isValidTarget(target)) return 400
  if (!isTargetAllowed(target)) return 403  // Against ALLOWED_SCAN_TARGETS
  
  // Step C: Check entitlements
  const entitlementResult = await requireEntitlement({
    userId: user.id,
    targetId,
    scanType: 'active_scan'  // Requires pro/enterprise plan
  })
  if (!entitlementResult.ok) return 403  // User is on free plan
  
  // Step D: Select AI model
  const selectedModel = selectOptimalModel(prompt, preferredModel, userPlan)
  // → Analyzes: prompt length, keywords, user's plan
  // → Returns: { id: 'gpt-4-mini', name: 'GPT-4 Mini', confidence: 0.95 }
  
  // Step E: Create scan record
  const scan = await insertScanServer({
    user_id: user.id,
    target: 'example.com',
    prompt: 'Run a comprehensive port scan',
    status: 'queued',
    ai_model: selectedModel.id,
    start_time: new Date().toISOString()
  })
  // → Returns: { id: 'scan-uuid-123', status: 'queued', ... }
  
  // Step F: Update status to running
  await updateScanStatusServer(scan.id, 'running')
  
  // Step G: Get AI recommendation (Agent or MCPRouter)
  let suggestions = []
  if (AGENT_WORKFLOW_ENABLED) {
    try {
      const agentResult = await runAgentWorkflow({
        prompt,
        target: 'example.com',
        userId: user.id,
        userPlan
      })
      // → OpenAI Agents returns: { "tool": "nmap", "flags": ["-sV", "-sC"], ... }
      suggestions = parseAIResponse(agentResult.response)
    } catch (e) {
      // Fallback to MCPRouter
      const aiResponse = await mcpRouter.executePrompt(prompt, selectedModel.id, systemPrompt)
      suggestions = parseAIResponse(aiResponse.response)
    }
  }
  
  // Step H: Validate & execute scan
  const { tool, flags, target: finalTarget } = suggestions[0]
  const command = buildScanCommand(tool, flags, finalTarget)
  
  // Spawn async execution (don't wait)
  dockerManager.executeScan(scan.id, command, user.id)
    .catch(err => {
      updateScanStatusServer(scan.id, 'failed', { error: err.message })
    })
  
  // Step I: Return immediately (scan runs in background)
  return NextResponse.json({
    scanId: scan.id,
    status: 'running',
    message: 'Scan initiated'
  })
}

// 3. DOCKER MANAGER (Background process)
private async realExecution(scanId, command, userId) {
  // Parse command: "nmap -sV -sC example.com"
  const tool = detectTool(command)  // "nmap"
  const meta = TOOL_IMAGES['nmap']  // { image: "kalilinux/kali:latest", baseArgs: ["nmap"] }
  
  // Build Docker command
  const dockerArgs = [
    'run', '--rm',
    '--cpus=0.5', '--memory=512m',
    'kalilinux/kali:latest',
    'nmap', '-sV', '-sC', 'example.com'
  ]
  
  // Spawn subprocess
  const child = spawn('docker', dockerArgs)
  
  // Stream stdout/stderr
  child.stdout.on('data', (data) => {
    const text = data.toString()
    
    // Insert log row
    await insertScanLogServer({
      scan_id: scanId,
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Tool output',
      raw_output: text
    })
    
    // Broadcast via WebSocket
    webSocketManager.broadcastScanProgress(scanId, userId, {
      scanId,
      status: 'running',
      progress: 50,
      currentStep: 'Scanning ports...',
      output: text
    })
  })
  
  // Enforce timeout
  setTimeout(() => {
    child.kill('SIGKILL')  // Force kill after max_execution_time
  }, 300000)  // 5 minutes for nmap
  
  // Wait for completion
  await new Promise((resolve) => {
    child.on('exit', (code) => {
      if (code === 0) {
        updateScanStatusServer(scanId, 'completed', { output: allOutput })
        webSocketManager.broadcastScanProgress(scanId, userId, {
          status: 'completed',
          progress: 100
        })
      } else {
        updateScanStatusServer(scanId, 'failed', { error: 'Tool exited with error' })
      }
      resolve(code)
    })
  })
}

// 4. BROWSER: Real-time updates via WebSocket
useEffect(() => {
  const { isConnected, subscribeScan } = useWebSocket({
    userId,
    onScanProgress: (progress) => {
      setOutput(prev => prev + progress.output)
      setProgress(progress.progress)
    },
    onScanComplete: (result) => {
      setStatus('completed')
      showToast('Scan finished!')
    }
  })
  
  subscribeScan(scanId)
}, [scanId])

// 5. BROWSER: User requests analysis
POST /api/ai-analysis {
  scanId: 'scan-uuid-123',
  context: 'Focus on critical vulnerabilities'
}

// 6. API: Post-process results
export async function POST(request: NextRequest) {
  const user = await getCurrentUserServer(request)
  const { scanId, context } = await request.json()
  
  // Get scan + logs
  const scan = await getScanByIdServer(scanId)
  const logs = await getScanLogsServer(scanId)
  
  // Verify ownership
  if (scan.user_id !== user.id) return 403
  
  // Use AI to analyze
  const rawOutput = logs.map(l => l.raw_output).join('\n')
  const analysisPrompt = `Analyze these security scan results...\n${rawOutput}`
  
  const analysis = await mcpRouter.executePrompt(
    analysisPrompt,
    scan.ai_model,
    systemPrompt
  )
  
  // Parse findings and store report
  const findings = parseFindings(analysis.response, rawOutput)
  const report = await insertReportServer({
    scan_id: scanId,
    findings,
    summary: generateSummary(findings),
    risk_score: calculateRiskScore(findings),
    ai_analysis: analysis.response,
    recommendations: generateRecommendations(findings)
  })
  
  return NextResponse.json({
    report,
    findings: findings.slice(0, 10),  // Preview first 10
    hasMore: findings.length > 10
  })
}
```

### Example 2: Entitlement Validation (Access Control)

```typescript
// User initiates scan on target
POST /api/scan {
  targetId: 'target-uuid-456',
  scanType: 'active_web_scan'
}

// API checks entitlements
const entitlementResult = await requireEntitlement({
  userId: user.id,
  targetId: 'target-uuid-456',
  scanType: 'active_web_scan'
})

// Internal checks:
// 1. Load user's plan from user_profiles
const entitlement = await getEntitlementForUser(userId)
// → { plan: 'free', allowedScanTypes: ['headers_tls'] }

// 2. Check if plan allows this scan type
if (!PLAN_SCAN_TYPES['free'].includes('active_web_scan')) {
  // Allowed: ['headers_tls'] only
  return { ok: false, reason: 'Scan type not allowed for current plan' }
}

// 3. Verify target ownership
const target = await getTargetByIdServer('target-uuid-456')
// → { project_id: 'project-xyz', active_scans_allowed: true, ... }

const project = await getProjectByIdServer('project-xyz')
// → { owner_id: 'auth-user-id-999', ... }

if (project.owner_id !== user.id) {
  return { ok: false, reason: 'Target is not owned by this account' }
}

// 4. Check if target allows active scans
if (!target.active_scans_allowed) {
  return { ok: false, reason: 'Target is not enabled for active scans' }
}

// ✅ All checks passed
return { ok: true, entitlement, target }
```

### Example 3: Model Selection via MCPRouter

```typescript
// User submits scan with preferred model
POST /api/scan {
  prompt: "Find SQL injection vulnerabilities in my web application",
  preferredModel: "claude-3-sonnet"
}

// MCPRouter.selectOptimalModel() executes:
const selectedModel = selectOptimalModel(
  "Find SQL injection vulnerabilities in my web application",
  "claude-3-sonnet",  // User preference
  "pro"               // User plan
)

// 1. Filter models by plan
let availableModels = AI_MODELS.filter(m => m.available)
// pro plan can use: gpt-4, gpt-4-mini, claude-3-sonnet, claude-3-haiku, llama-3.1-*
// (excludes deepseek-v2 for pro)

// 2. Check if preferred model is available for plan
const preferred = availableModels.find(m => m.id === 'claude-3-sonnet')
if (preferred) {
  return {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    reasoning: 'User preference',
    confidence: 1.0
  }
}

// If not preferred or unavailable, score models
const complexity = analyzePromptComplexity(prompt)
// → Looks for: keywords (SQL injection, XSS, CSRF)
// → Word count: 9 words (low-mid complexity)
// → Result: 0.65 (on 0-1 scale)

const requirements = extractRequirements(prompt)
// → { needsSecurity: true, needsReasoning: true, needsCode: false }

const scores = availableModels.map(m => ({
  model: m,
  score: scoreModel(m, 0.65, requirements, 'pro')
})).sort((a, b) => b.score - a.score)

// Scoring formula (pseudo):
// score = (accuracy * 0.4) + (latency_inverse * 0.3) + (cost_inverse * 0.2) + (capabilities_match * 0.1)
// Top candidate: claude-3-sonnet
//   - accuracy: 96 (high), latency: 1.8s (decent), cost: $0.015/1k tokens
//   - score: 85.5

return {
  id: 'claude-3-sonnet',
  name: 'Claude 3 Sonnet',
  reasoning: 'Best balance of accuracy and latency for security analysis',
  confidence: 0.92
}
```

### Example 4: WebSocket Real-Time Updates

```typescript
// Browser subscribes to scan
const { subscribeScan } = useWebSocket({
  userId: 'auth-user-123',
  onScanProgress: (progress) => {
    console.log(`${progress.progress}% - ${progress.currentStep}`)
  }
})

subscribeScan('scan-uuid-789')

// Docker container runs nmap, outputs results
child.stdout.on('data', (data) => {
  const text = data.toString()
  // "Nmap scan report for 192.168.1.1"
  
  // 1. Insert into scan_logs
  await insertScanLogServer({
    scan_id: 'scan-uuid-789',
    timestamp: '2026-01-18T10:30:45Z',
    level: 'info',
    message: 'Command output',
    raw_output: text
  })
  
  // 2. Broadcast via WebSocket
  webSocketManager.broadcastScanProgress('scan-uuid-789', 'auth-user-123', {
    scanId: 'scan-uuid-789',
    status: 'running',
    progress: 42,
    currentStep: 'Port scanning...',
    output: text,
    estimatedTimeRemaining: 120
  })
})

// Browser receives WebSocketMessage:
{
  type: 'scan_progress',
  scanId: 'scan-uuid-789',
  userId: 'auth-user-123',
  data: {
    scanId: 'scan-uuid-789',
    status: 'running',
    progress: 42,
    currentStep: 'Port scanning...',
    output: 'Nmap scan report for 192.168.1.1',
    estimatedTimeRemaining: 120
  },
  timestamp: '2026-01-18T10:30:45Z'
}

// Browser hook fires onScanProgress callback
setProgress(42)
setOutput(prev => prev + 'Nmap scan report for 192.168.1.1')
setCurrentStep('Port scanning...')

// When Docker exits (success)
webSocketManager.broadcastScanProgress('scan-uuid-789', 'auth-user-123', {
  status: 'completed',
  progress: 100,
  currentStep: 'Scan completed'
})

// Browser hook fires onScanComplete callback
showToast('✅ Scan finished in 4m 32s')
```

## Component Patterns

### Client Components
- Use `"use client"` pragma for interactivity
- `src/components/ChatKitConsole.tsx`: OpenAI ChatKit widget with entitlement filtering
- All UI built with shadcn/ui (Alert, Card, Button, Select, etc.)
- Components update via real-time WebSocket or polling

### Hooks
- `src/hooks/useWebSocket.ts`: Real-time scan progress
  - Manages WebSocket connection + fallback polling
  - Subscribes to specific scans, containers, notifications
  - Handles reconnection logic (exponential backoff)
  - Callback-based architecture (onScanProgress, onScanComplete, etc.)
- `src/hooks/usePanelLayout.ts`: Resizable panel state

### Server Boundary (`"use server"`)
Functions in `src/lib/supabase.ts` marked for server-only execution:
- `getCurrentUserServer()` - Extract auth from request cookies
- `insertScanServer()`, `updateScanStatusServer()` - DB writes
- `getScanLogsServer()` - Fetch logs with Supabase
- All use `getSupabaseServerClient()` for admin operations

## Middleware & Route Protection

### `middleware.ts` Flow

```typescript
PUBLIC_ROUTES = [/, /auth, /docs, /privacy]
ROLE_PROTECTED_ROUTES = [
  { path: '/admin', allowedRoles: ['admin'] },
  { path: '/dashboard', allowedRoles: ['admin', 'user'] },
  { path: '/settings', allowedRoles: ['admin'] }
]

export async function middleware(request: NextRequest) {
  // 1. Check if route is public
  if (PUBLIC_ROUTES.includes(pathname)) {
    return response  // Allow access
  }
  
  // 2. Create Supabase client bound to request
  const { supabase, response } = createClient(request)
  
  // 3. Get current user from session
  const { data: { user } } = await supabase.auth.getUser()
  
  // 4. If not logged in + protected route
  if (!user && !isPublic) {
    return NextResponse.redirect('/auth')
  }
  
  // 5. Check role-based access
  if (user) {
    const role = user.user_metadata?.role || 'guest'
    const matchedRoute = ROLE_PROTECTED_ROUTES.find(r => pathname.startsWith(r.path))
    
    if (matchedRoute && !matchedRoute.allowedRoles.includes(role)) {
      return NextResponse.redirect('/unauthorized')
    }
  }
  
  return response
}
```

**Execution order:**
1. Middleware runs BEFORE route handler
2. Route handler has `user` object from Supabase (refreshed session)
3. API route can extract additional data via `getCurrentUserServer(request)`

## Supabase Integration Points

### Authentication Flow
```typescript
// Supabase Auth (managed by Netlify/Supabase)
1. User signs up at /auth
2. Supabase creates auth.users row
3. Session stored in browser cookie
4. Middleware refreshes session on each request
5. getCurrentUserServer() extracts from cookies

// Table: auth.users (Supabase managed)
id: uuid
email: string (unique)
user_metadata: { role, full_name, ... }
```

### Server-Only Database Operations
```typescript
// All server functions use getSupabaseServerClient()
// This uses SUPABASE_SERVICE_ROLE_KEY (admin key)
// Safe to use in /api/* routes (Node.js only)

export const insertScanServer = async (scan) => {
  const supabaseServer = getSupabaseServerClient()
  const { data, error } = await supabaseServer
    .from('scans')
    .insert([scan])
    .select()
  
  if (error) throw error
  return data[0]
}

// NEVER use this in browser components - keys would be exposed
```

### Real-Time Subscriptions (Optional Future)
```typescript
// Supabase Realtime could replace polling
const channel = supabase
  .channel(`scan:${scanId}`)
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'scan_logs', filter: `scan_id=eq.${scanId}` },
    (payload) => {
      // New log row inserted
      setOutput(prev => prev + payload.new.raw_output)
    }
  )
  .subscribe()
```

## Integration Points & External Services

### 1. OpenAI API Integration
**Files:** `src/lib/mcpRouter.ts`, `src/app/api/ai-analysis/route.ts`

```typescript
// MCPRouter.callOpenAI()
const OpenAI = (await import('openai')).default
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  temperature: 0.7,
  max_tokens: 2000
})

return {
  response: response.choices[0].message.content,
  model: 'gpt-4',
  tokens: response.usage.total_tokens
}
```

**Error handling:**
- Missing API key → model marked unavailable
- Rate limit → caught, logged, fallback tries next model
- Timeout → caught after 30s, tries fallback

### 2. OpenAI Agents SDK
**File:** `src/lib/agentWorkflow.ts`

```typescript
import { Agent, Runner, withTrace } from '@openai/agents'

const scanPlanner = new Agent({
  name: 'Scan Planner',
  instructions: '...',
  model: 'gpt-4.1'  // Agents SDK model
})

const runner = new Runner({ traceMetadata: { user_id } })
const result = await runner.run(scanPlanner, messages)

// Returns: { finalOutput: JSON string, threads: [...], usage: {...} }
```

### 3. Anthropic Claude Integration
**File:** `src/lib/mcpRouter.ts` callAnthropic()

```typescript
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const response = await client.messages.create({
  model: 'claude-3-sonnet-20240229',
  max_tokens: 2000,
  messages: [
    { role: 'user', content: prompt }
  ]
})
```

### 4. Docker Integration via Dockerode
**File:** `src/lib/dockerManager.ts`

```typescript
import { spawn } from 'node:child_process'

// executeScan() spawns Docker process
const DOCKER = process.platform === 'win32' ? 'docker.exe' : 'docker'

const child = spawn(DOCKER, [
  'run', '--rm',
  '--cpus=0.5',
  '--memory=512m',
  'kalilinux/kali:latest',
  'nmap', '-sV', 'target'
])

// Streams stdout/stderr in real-time
child.stdout.on('data', (data) => {
  // Insert into scan_logs, broadcast via WebSocket
})
```

**Why Docker?**
- Isolation: Tool runs in container, can't access host
- Resource limits: CPU/memory capped per tool
- Reproducibility: Same environment every time
- Security: Tool runs as unprivileged user inside container

### 5. OpenAI ChatKit Widget (Optional)
**File:** `src/components/ChatKitConsole.tsx`

```typescript
// Gated by NEXT_PUBLIC_CHATKIT_ENABLED='true'
// Embedded OpenAI ChatKit for assisted scan configuration

import { ChatKit } from '@openai/chatkit-react'

<ChatKit
  workflowId={CHATKIT_WORKFLOW_ID}
  accessToken={sessionToken}
  onEventReceived={(event) => {
    // Handle ChatKit events (tool calls, suggestions)
  }}
/>
```

**Integration:**
- User types scan request into ChatKit
- ChatKit calls OpenAI APIs with workflow
- Suggestions populate scan modal
- On "Run Scan", triggers POST /api/scan

## Common Tasks for AI Agents

### Adding a New API Endpoint
1. Create file: `src/app/api/[feature]/route.ts`
2. Import `getCurrentUserServer` for auth check
3. Follow error response pattern above
4. Document in `README.md` or inline comments

### Adding a Security Tool
1. Define in `src/lib/toolsRouter.ts` SECURITY_TOOLS array
2. Set `risk_level`, `max_execution_time`, `requires_auth`
3. Docker image must be in `src/lib/toolImages.ts`
4. Verify DockerManager can detect tool name

### Debugging Scan Failures
1. Check `middleware.ts` for auth/role issues
2. Verify entitlements in `src/lib/policy/entitlementMiddleware.ts`
3. Check scan_logs in Supabase for Docker errors
4. Use `pnpm dev` with browser DevTools for WebSocket inspection

### Model Routing Issues
1. Verify API keys set in environment
2. Check `src/lib/mcpRouter.ts` AI_MODELS array has model ID
3. Review `src/app/api/set-model/route.ts` for user preference override
4. Default fallback: gpt-4 if all providers unavailable

## Build & Deployment

### Local Development
```bash
pnpm dev        # Next.js dev server (port 3000)
pnpm build      # Full TypeScript + type check
pnpm lint       # Biome linting + tsc validation
pnpm test       # Jest (ts-jest preset)
```

**Environment setup for local dev:**
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=sk-...

AGENT_WORKFLOW_ENABLED=true
AGENT_MODEL=gpt-4.1

ALLOWED_SCAN_TARGETS=localhost,127.0.0.1,example.com
REAL_EXECUTION=true  # Enable Docker execution
```

### Production (Vercel)
- **Deploy:** Configured via `vercel.json` with Next.js 15 native support
- **Build command:** `pnpm install && pnpm build`
- **Node version:** 20.x (optimized performance & security)
- **Framework:** Next.js 15 App Router with native API routes
- **Environment:** All secrets via Vercel Project Dashboard (never in code)

**Critical Vercel Configuration:**
```json
{
  "buildCommand": "pnpm install && pnpm build",
  "installCommand": "pnpm install --frozen-lockfile",
  "devCommand": "pnpm dev",
  "nodeVersion": "20.x",
  "regions": ["iad1", "sfo1"],
  "functions": {
    "app/api/**": {
      "runtime": "nodejs20.x",
      "memory": 1024,
      "maxDuration": 60
    }
  }
}
```

**Production environment variables (set in Vercel Project Settings → Environment Variables):**

Public variables (prefix `NEXT_PUBLIC_`):
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_CHATKIT_ENABLED=true|false
```

Server-only secrets (API routes, no prefix):
```
SUPABASE_SERVICE_ROLE_KEY=eyJ...     (admin operations)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=sk-...
LLAMA_STACK_API_KEY=...
AGENT_MODEL=gpt-4.1                   (OpenAI Agents model)
AGENT_WORKFLOW_ENABLED=true|false     (enable intelligent planning)
ALLOWED_SCAN_TARGETS=prod1.example.com,prod2.example.com,localhost
REAL_EXECUTION=true|false             (enable Docker execution)
CHATKIT_WORKFLOW_ID=...               (optional ChatKit integration)
```

**Vercel-Specific Setup Steps:**

1. **Fork/Deploy to Vercel:**
   ```bash
   # Via Vercel CLI
   vercel
   
   # Or via GitHub (recommended)
   # Push to GitHub → Connect repo in Vercel dashboard
   ```

2. **Configure environment variables in Vercel Dashboard:**
   - Project Settings → Environment Variables
   - Add all variables listed above
   - Set environment scope: Production, Preview, Development as needed

3. **Configure Docker support:**
   - Vercel serverless functions support Docker-based tool execution
   - Ensure `REAL_EXECUTION=true` for Docker commands
   - Monitor function duration (currently set to 60s, increase if needed)

4. **Set custom domains (if applicable):**
   - Domains → Add → Configure DNS or change name servers

5. **Enable preview deployments:**
   - Auto-enabled on all PRs for staging environments
   - Each PR gets isolated environment with its own environment variables

**Important Notes:**
- Vercel's Edge Network auto-scales based on demand
- API routes in `app/api/**` run as serverless functions (max 60s by default, can increase)
- Docker execution via `spawn()` works within serverless function constraints
- WebSocket connections supported (handled by Vercel Edge Runtime)
- Build output cached; rebuilds only on code changes

### Docker for Tool Execution
**File:** `docker/Dockerfile.kali`

Pentriarch uses **Kali Linux image** for security tools:
```dockerfile
FROM kalilinux/kali:latest

# Install security tools: nmap, nikto, sqlmap, etc.
RUN apt-get update && apt-get install -y \
    nmap nikto sqlmap gobuster ...
```

**Why Kali?**
- Pre-configured with 600+ security tools
- Regularly updated
- Works across Linux/Windows/Mac (via Docker)

**Docker execution from Node.js:**
```typescript
// spawn Docker from dockerManager.ts
spawn('docker', ['run', '--rm', 'kalilinux/kali:latest', 'nmap', ...args])
```

### TypeScript Configuration
- **Alias `@/*`** maps to `src/*` (`tsconfig.json`)
- **Strict mode** enabled (catch more errors at compile time)
- **skipLibCheck** true for faster builds
- **Next.js 15 plugin** auto-enabled for type definitions

### Code Quality Tools

**Biome** (linting + formatting)
```json
// biome.json
{
  "linter": { "enabled": true },
  "formatter": { "indentStyle": "space" },
  "organizeImports": { "enabled": true }
}
```

Run: `pnpm lint` (auto-fixes) or `pnpm format`

**TypeScript**
```bash
pnpm build  # Runs tsc --noEmit (type check)
```

**Jest** (testing)
```bash
pnpm test   # Runs Jest with ts-jest preset
```
Config in `jest.config.ts`

## Code Quality

- **Linting**: Biome (not ESLint) - `pnpm format` auto-fixes
- **Type Safety**: Strict TypeScript; use Zod for API validation
- **Comments**: Minimal but precise; explain "why" for non-obvious patterns
- **Imports**: Organized via Biome; use `@/` alias for src imports

## Integration Points to Know

- **OpenAI Agents SDK**: Used for scan planning (see `src/lib/agentWorkflow.ts`)
- **OpenAI ChatKit**: Optional UI widget (gated by `NEXT_PUBLIC_CHATKIT_ENABLED`)
- **Dockerode**: Wraps Docker CLI; see `src/lib/dockerManager.ts` for spawn patterns
- **Vercel Analytics**: Integrated in `src/app/layout.tsx`

---

**Last Updated**: January 2026  
**Maintainers**: Tech-Rizon  
**Contact**: Refer to `README.md` for contribution guidelines
