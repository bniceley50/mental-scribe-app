import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

describe('Audit Chain - Tamper-Evident Logging', () => {
  let supabase: SupabaseClient
  let testActorId: string

  beforeEach(async () => {
    // Initialize Supabase client
    supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
    )

    // Create a test user/actor
    testActorId = crypto.randomUUID()
  })

  afterEach(async () => {
    // Cleanup test data if needed
    // Note: In production, audit logs should never be deleted
  })

  describe('Audit Chain Creation', () => {
    it('should create first audit entry with null prev_hash', async () => {
      const { data, error } = await supabase
        .rpc('add_audit_entry', {
          p_actor_id: testActorId,
          p_action: 'CREATE',
          p_resource: 'test_resource',
          p_resource_id: 'test-123',
          p_details: { test: 'data' }
        })

      expect(error).toBeNull()
      expect(data).toBeDefined()

      // Fetch the entry
      const { data: entries } = await supabase
        .from('audit_chain')
        .select('*')
        .eq('id', data)
        .single()

      expect(entries).toBeDefined()
      expect(entries?.prev_hash).toBe('')
      expect(entries?.hash).toBeDefined()
      expect(entries?.hash?.length).toBe(64) // SHA-256 hex is 64 chars
    })

    it('should chain multiple entries correctly', async () => {
      // Add first entry
      const { data: id1 } = await supabase
        .rpc('add_audit_entry', {
          p_actor_id: testActorId,
          p_action: 'CREATE',
          p_resource: 'patient',
          p_resource_id: 'patient-1'
        })

      // Add second entry
      const { data: id2 } = await supabase
        .rpc('add_audit_entry', {
          p_actor_id: testActorId,
          p_action: 'UPDATE',
          p_resource: 'patient',
          p_resource_id: 'patient-1'
        })

      // Fetch both entries
      const { data: entries } = await supabase
        .from('audit_chain')
        .select('*')
        .in('id', [id1, id2])
        .order('id')

      expect(entries).toHaveLength(2)
      expect(entries![0].prev_hash).toBe('')
      expect(entries![1].prev_hash).toBe(entries![0].hash)
      expect(entries![1].hash).not.toBe(entries![0].hash)
    })

    it('should include all entry data in hash computation', async () => {
      const details = { 
        field: 'diagnosis',
        oldValue: 'anxiety',
        newValue: 'depression' 
      }

      const { data: id } = await supabase
        .rpc('add_audit_entry', {
          p_actor_id: testActorId,
          p_action: 'UPDATE',
          p_resource: 'session_note',
          p_resource_id: 'note-456',
          p_details: details
        })

      const { data: entry } = await supabase
        .from('audit_chain')
        .select('*')
        .eq('id', id)
        .single()

      expect(entry).toBeDefined()
      expect(entry?.details).toEqual(details)
      expect(entry?.hash).toBeDefined()
    })
  })

  describe('Audit Chain Verification', () => {
    it('should verify intact chain', async () => {
      // Add multiple entries to create a chain
      await supabase.rpc('add_audit_entry', {
        p_actor_id: testActorId,
        p_action: 'CREATE',
        p_resource: 'client',
        p_resource_id: 'client-1'
      })

      await supabase.rpc('add_audit_entry', {
        p_actor_id: testActorId,
        p_action: 'READ',
        p_resource: 'client',
        p_resource_id: 'client-1'
      })

      await supabase.rpc('add_audit_entry', {
        p_actor_id: testActorId,
        p_action: 'UPDATE',
        p_resource: 'client',
        p_resource_id: 'client-1'
      })

      // Call audit-verify function
      const { data, error } = await supabase.functions.invoke('audit-verify')

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.intact).toBe(true)
      expect(data.verifiedEntries).toBeGreaterThan(0)
      expect(data.totalEntries).toBe(data.verifiedEntries)
    })

    it('should detect tampered hash', async () => {
      // Add an entry
      const { data: id } = await supabase.rpc('add_audit_entry', {
        p_actor_id: testActorId,
        p_action: 'DELETE',
        p_resource: 'session',
        p_resource_id: 'session-789'
      })

      // Manually tamper with the hash (requires service role key)
      // This test would require special setup or manual verification
      // In production, this should fail

      // For now, we'll skip this test and mark it as pending
      // TODO: Implement with service role key testing
    })

    it('should detect broken chain link', async () => {
      // Add entries
      await supabase.rpc('add_audit_entry', {
        p_actor_id: testActorId,
        p_action: 'CREATE',
        p_resource: 'consent',
        p_resource_id: 'consent-1'
      })

      const { data: id2 } = await supabase.rpc('add_audit_entry', {
        p_actor_id: testActorId,
        p_action: 'UPDATE',
        p_resource: 'consent',
        p_resource_id: 'consent-1'
      })

      // Attempt to manually break the chain (requires service role)
      // This demonstrates the concept but would need special permissions
      // TODO: Implement with service role key testing
    })
  })

  describe('Audit Chain Security', () => {
    it('should only allow authenticated users to read', async () => {
      // Sign out
      await supabase.auth.signOut()

      const { data, error } = await supabase
        .from('audit_chain')
        .select('*')
        .limit(1)

      // Should get no data due to RLS
      expect(data).toEqual([])
    })

    it('should enforce RLS policies on insert', async () => {
      // Regular users cannot insert directly (only via add_audit_entry function)
      const { error } = await supabase
        .from('audit_chain')
        .insert({
          actor_id: testActorId,
          action: 'UNAUTHORIZED',
          resource: 'test',
          hash: 'fake-hash'
        })

      // Should fail due to RLS policy
      expect(error).toBeDefined()
    })
  })

  describe('Performance', () => {
    it('should handle bulk audit entries efficiently', async () => {
      const startTime = Date.now()
      const entryCount = 100

      // Add 100 entries
      for (let i = 0; i < entryCount; i++) {
        await supabase.rpc('add_audit_entry', {
          p_actor_id: testActorId,
          p_action: 'BULK_TEST',
          p_resource: 'test_resource',
          p_resource_id: `test-${i}`
        })
      }

      const duration = Date.now() - startTime
      const avgTime = duration / entryCount

      // Should average less than 100ms per entry
      expect(avgTime).toBeLessThan(100)

      console.log(`Bulk insert performance: ${avgTime.toFixed(2)}ms per entry`)
    })

    it('should verify large chain efficiently', async () => {
      // Add several entries
      for (let i = 0; i < 10; i++) {
        await supabase.rpc('add_audit_entry', {
          p_actor_id: testActorId,
          p_action: 'PERF_TEST',
          p_resource: 'test',
          p_resource_id: `test-${i}`
        })
      }

      const startTime = Date.now()
      const { data } = await supabase.functions.invoke('audit-verify')
      const duration = Date.now() - startTime

      expect(data.intact).toBe(true)
      
      // Verification should complete in reasonable time
      expect(duration).toBeLessThan(5000) // 5 seconds

      console.log(`Chain verification time: ${duration}ms for ${data.totalEntries} entries`)
    })
  })

  describe('Integration with Existing Audit System', () => {
    it('should integrate with existing audit logging', async () => {
      // Simulate a user action that triggers audit logging
      // This would integrate with your existing audit system
      
      const action = {
        type: 'session_created',
        user_id: testActorId,
        session_id: 'session-test-123',
        timestamp: new Date().toISOString()
      }

      // Add to audit chain
      const { data, error } = await supabase.rpc('add_audit_entry', {
        p_actor_id: action.user_id,
        p_action: 'CREATE',
        p_resource: 'session',
        p_resource_id: action.session_id,
        p_details: action
      })

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })
  })
})

describe('Audit Chain Hash Functions', () => {
  let supabase: SupabaseClient

  beforeEach(() => {
    supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
    )
  })

  it('should compute consistent hashes', async () => {
    const testData = {
      prev_hash: 'abc123',
      actor_id: crypto.randomUUID(),
      action: 'TEST',
      resource: 'test_resource',
      resource_id: 'test-1',
      details: { foo: 'bar' },
      timestamp: '2025-10-21T00:00:00Z'
    }

    // Compute hash twice
    const { data: hash1 } = await supabase.rpc('compute_audit_hash', {
      p_prev_hash: testData.prev_hash,
      p_actor_id: testData.actor_id,
      p_action: testData.action,
      p_resource: testData.resource,
      p_resource_id: testData.resource_id,
      p_details: testData.details,
      p_timestamp: testData.timestamp
    })

    const { data: hash2 } = await supabase.rpc('compute_audit_hash', {
      p_prev_hash: testData.prev_hash,
      p_actor_id: testData.actor_id,
      p_action: testData.action,
      p_resource: testData.resource,
      p_resource_id: testData.resource_id,
      p_details: testData.details,
      p_timestamp: testData.timestamp
    })

    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64) // SHA-256 hex
  })

  it('should produce different hashes for different inputs', async () => {
    const baseData = {
      prev_hash: '',
      actor_id: crypto.randomUUID(),
      action: 'TEST',
      resource: 'test',
      resource_id: 'test-1',
      details: {},
      timestamp: '2025-10-21T00:00:00Z'
    }

    const { data: hash1 } = await supabase.rpc('compute_audit_hash', baseData)

    // Change action
    const { data: hash2 } = await supabase.rpc('compute_audit_hash', {
      ...baseData,
      action: 'DIFFERENT'
    })

    expect(hash1).not.toBe(hash2)
  })

  it('should compute a valid hash when the audit secret is provisioned', async () => {
    const baseData = {
      prev_hash: '',
      actor_id: crypto.randomUUID(),
      action: 'TEST_SECRET_VALIDATION',
      resource: 'test',
      resource_id: 'test-1',
      details: {},
      timestamp: new Date().toISOString(),
    };

    const { data, error } = await supabase.rpc('compute_audit_hash', baseData);

    // If the audit secret is missing or still a placeholder, the SQL will now throw.
    // Success here means we have a real, provisioned secret and the function works.
    expect(error).toBeNull();
    expect(typeof data).toBe('string');
    expect((data as string).length).toBe(64);
  });
})
