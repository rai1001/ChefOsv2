'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { AgentConfig, AgentSuggestion, AgentType, SuggestionStatus } from '../types'

const supabase = createClient()

// ── get_agent_suggestions ────────────────────────────────────────────────────

export function useAgentSuggestions(
  hotelId: string,
  status: SuggestionStatus = 'pending',
  limit = 50,
) {
  return useQuery({
    queryKey: ['agent-suggestions', hotelId, status, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_agent_suggestions', {
        p_hotel_id: hotelId,
        p_status:   status,
        p_limit:    limit,
      })
      if (error) throw new Error(error.message)
      return (data ?? []) as AgentSuggestion[]
    },
    enabled: !!hotelId,
    refetchInterval: 30_000, // polling 30s
  })
}

// ── approve_suggestion ───────────────────────────────────────────────────────

export function useApproveSuggestion(hotelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (suggestionId: string) => {
      const { data, error } = await supabase.rpc('approve_suggestion', {
        p_hotel_id:      hotelId,
        p_suggestion_id: suggestionId,
      })
      if (error) throw new Error(error.message)
      return data as Record<string, unknown>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent-suggestions', hotelId] })
    },
  })
}

// ── reject_suggestion ────────────────────────────────────────────────────────

export function useRejectSuggestion(hotelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const { error } = await supabase.rpc('reject_suggestion', {
        p_hotel_id:      hotelId,
        p_suggestion_id: id,
        p_note:          note ?? null,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent-suggestions', hotelId] })
    },
  })
}

// ── get_agent_configs ────────────────────────────────────────────────────────

export function useAgentConfigs(hotelId: string) {
  return useQuery({
    queryKey: ['agent-configs', hotelId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_agent_configs', {
        p_hotel_id: hotelId,
      })
      if (error) throw new Error(error.message)
      return (data ?? []) as AgentConfig[]
    },
    enabled: !!hotelId,
  })
}

// ── upsert_agent_config ──────────────────────────────────────────────────────

export function useUpsertAgentConfig(hotelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      agentType,
      isActive,
      config,
    }: {
      agentType: AgentType
      isActive: boolean
      config: Record<string, unknown>
    }) => {
      const { error } = await supabase.rpc('upsert_agent_config', {
        p_hotel_id:   hotelId,
        p_agent_type: agentType,
        p_is_active:  isActive,
        p_config:     config,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent-configs', hotelId] })
    },
  })
}

// ── Sugerencias por estado (contador de pendientes) ──────────────────────────

export function usePendingSuggestionsCount(hotelId: string) {
  return useQuery({
    queryKey: ['agent-suggestions-count', hotelId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_agent_suggestions', {
        p_hotel_id: hotelId,
        p_status:   'pending',
        p_limit:    100,
      })
      if (error) return 0
      return (data ?? []).length as number
    },
    enabled: !!hotelId,
    refetchInterval: 60_000,
  })
}
