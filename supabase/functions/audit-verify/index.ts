import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'

interface AuditEntry {
  id: number
  timestamp: string
  actor_id: string | null
  action: string
  resource: string
  resource_id: string | null
  details: Record<string, unknown>
  prev_hash: string | null
  hash: string
}

interface VerifyResult {
  intact: boolean
  totalEntries: number
  verifiedEntries: number
  error?: string
  brokenAtEntry?: number
  details?: {
    expected: string
    actual: string
  }
}

/**
 * Compute HMAC-SHA256 hash for audit entry
 */
async function computeHash(
  prevHash: string,
  actorId: string | null,
  action: string,
  resource: string,
  resourceId: string | null,
  details: Record<string, unknown>,
  timestamp: string,
  secret: string
): Promise<string> {
  const payload = `${prevHash}|${actorId || 'null'}|${action}|${resource}|${resourceId || 'null'}|${JSON.stringify(details)}|${timestamp}`
  
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(payload)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(signature))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  return hashHex
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const auditSecret = Deno.env.get('AUDIT_SECRET') || 'default-audit-secret-CHANGE-IN-PRODUCTION'
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Verify user is authenticated and has admin role
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user has admin role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData?.role !== 'admin') {
      throw new Error('Insufficient permissions. Admin role required.')
    }

    // Fetch all audit entries in order
    const { data: entries, error: fetchError } = await supabase
      .from('audit_chain')
      .select('*')
      .order('id', { ascending: true })

    if (fetchError) {
      throw fetchError
    }

    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({
          intact: true,
          totalEntries: 0,
          verifiedEntries: 0,
          message: 'No audit entries to verify'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Verify the chain
    let verifiedCount = 0
    let prevHash = ''

    for (const entry of entries as AuditEntry[]) {
      // Check if prev_hash matches expected
      if (entry.prev_hash !== prevHash) {
        return new Response(
          JSON.stringify({
            intact: false,
            totalEntries: entries.length,
            verifiedEntries: verifiedCount,
            error: 'Chain broken: prev_hash mismatch',
            brokenAtEntry: entry.id,
            details: {
              expected: prevHash,
              actual: entry.prev_hash || 'null'
            }
          } as VerifyResult),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }

      // Recompute hash
      const computedHash = await computeHash(
        entry.prev_hash || '',
        entry.actor_id,
        entry.action,
        entry.resource,
        entry.resource_id,
        entry.details,
        entry.timestamp,
        auditSecret
      )

      // Verify hash matches
      if (computedHash !== entry.hash) {
        return new Response(
          JSON.stringify({
            intact: false,
            totalEntries: entries.length,
            verifiedEntries: verifiedCount,
            error: 'Chain broken: hash mismatch',
            brokenAtEntry: entry.id,
            details: {
              expected: computedHash,
              actual: entry.hash
            }
          } as VerifyResult),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }

      verifiedCount++
      prevHash = entry.hash
    }

    // All entries verified successfully
    return new Response(
      JSON.stringify({
        intact: true,
        totalEntries: entries.length,
        verifiedEntries: verifiedCount,
        message: 'Audit chain integrity verified successfully'
      } as VerifyResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error verifying audit chain:', error)
    
    return new Response(
      JSON.stringify({
        intact: false,
        totalEntries: 0,
        verifiedEntries: 0,
        error: error.message
      } as VerifyResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
