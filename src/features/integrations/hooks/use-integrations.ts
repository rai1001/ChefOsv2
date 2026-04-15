'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type {
  PmsIntegration,
  PosIntegration,
  IntegrationSyncLog,
  PmsType,
  PosType,
  PmsConfig,
  PosConfig,
} from '../types'

const supabase = createClient()

// ============================================================================
// PMS Integrations
// ============================================================================

export function usePmsIntegrations(hotelId: string) {
  return useQuery({
    queryKey: ['pms-integrations', hotelId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_pms_integrations', {
        p_hotel_id: hotelId,
      })
      if (error) throw error
      return (data ?? []) as PmsIntegration[]
    },
    enabled: !!hotelId,
  })
}

export function usePosIntegrations(hotelId: string) {
  return useQuery({
    queryKey: ['pos-integrations', hotelId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_pos_integrations', {
        p_hotel_id: hotelId,
      })
      if (error) throw error
      return (data ?? []) as PosIntegration[]
    },
    enabled: !!hotelId,
  })
}

// ============================================================================
// Sync Logs
// ============================================================================

export function useIntegrationSyncLogs(
  hotelId: string,
  options?: { pmsIntegrationId?: string; posIntegrationId?: string; limit?: number }
) {
  return useQuery({
    queryKey: ['integration-sync-logs', hotelId, options],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_integration_sync_logs', {
        p_hotel_id:        hotelId,
        p_limit:           options?.limit ?? 50,
        p_pms_integration: options?.pmsIntegrationId ?? null,
        p_pos_integration: options?.posIntegrationId ?? null,
      })
      if (error) throw error
      return (data ?? []) as IntegrationSyncLog[]
    },
    enabled: !!hotelId,
    refetchInterval: 10_000, // poll logs durante syncs activos
  })
}

// ============================================================================
// Mutaciones — crear
// ============================================================================

export function useCreatePmsIntegration(hotelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      pms_type:    PmsType
      name:        string
      credentials: Record<string, string>
      config?:     PmsConfig
    }) => {
      const { data, error } = await supabase.rpc('create_pms_integration', {
        p_hotel_id:    hotelId,
        p_pms_type:    params.pms_type,
        p_name:        params.name,
        p_credentials: params.credentials,
        p_config:      params.config ?? {},
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pms-integrations', hotelId] })
    },
  })
}

export function useCreatePosIntegration(hotelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      pos_type:    PosType
      name:        string
      credentials: Record<string, string>
      config?:     PosConfig
    }) => {
      const { data, error } = await supabase.rpc('create_pos_integration', {
        p_hotel_id:    hotelId,
        p_pos_type:    params.pos_type,
        p_name:        params.name,
        p_credentials: params.credentials,
        p_config:      params.config ?? {},
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pos-integrations', hotelId] })
    },
  })
}

// ============================================================================
// Mutaciones — actualizar
// ============================================================================

export function useUpdatePmsIntegration(hotelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      integration_id: string
      name?:          string
      credentials?:   Record<string, string>
      config?:        PmsConfig
    }) => {
      const { error } = await supabase.rpc('update_pms_integration', {
        p_hotel_id:       hotelId,
        p_integration_id: params.integration_id,
        p_name:           params.name          ?? null,
        p_credentials:    params.credentials   ?? null,
        p_config:         params.config        ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pms-integrations', hotelId] })
    },
  })
}

export function useUpdatePosIntegration(hotelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      integration_id: string
      name?:          string
      credentials?:   Record<string, string>
      config?:        PosConfig
    }) => {
      const { error } = await supabase.rpc('update_pos_integration', {
        p_hotel_id:       hotelId,
        p_integration_id: params.integration_id,
        p_name:           params.name          ?? null,
        p_credentials:    params.credentials   ?? null,
        p_config:         params.config        ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pos-integrations', hotelId] })
    },
  })
}

// ============================================================================
// Mutaciones — deshabilitar
// ============================================================================

export function useDisablePmsIntegration(hotelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (integrationId: string) => {
      const { error } = await supabase.rpc('disable_pms_integration', {
        p_hotel_id:       hotelId,
        p_integration_id: integrationId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pms-integrations', hotelId] })
    },
  })
}

export function useDisablePosIntegration(hotelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (integrationId: string) => {
      const { error } = await supabase.rpc('disable_pos_integration', {
        p_hotel_id:       hotelId,
        p_integration_id: integrationId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pos-integrations', hotelId] })
    },
  })
}

// ============================================================================
// Mutaciones — trigger sync
// ============================================================================

export function useTriggerPmsSync(hotelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      integration_id: string
      sync_type: 'test_connection' | 'sync_occupancy' | 'sync_reservations'
    }) => {
      const { data, error } = await supabase.rpc('trigger_pms_sync', {
        p_hotel_id:       hotelId,
        p_integration_id: params.integration_id,
        p_sync_type:      params.sync_type,
      })
      if (error) throw error
      return data as string  // log_id
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['integration-sync-logs', hotelId] })
      void qc.invalidateQueries({ queryKey: ['pms-integrations', hotelId] })
    },
  })
}

export function useTriggerPosSync(hotelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      integration_id: string
      sync_type: 'test_connection' | 'sync_sales' | 'push_kitchen_orders'
    }) => {
      const { data, error } = await supabase.rpc('trigger_pos_sync', {
        p_hotel_id:       hotelId,
        p_integration_id: params.integration_id,
        p_sync_type:      params.sync_type,
      })
      if (error) throw error
      return data as string  // log_id
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['integration-sync-logs', hotelId] })
      void qc.invalidateQueries({ queryKey: ['pos-integrations', hotelId] })
    },
  })
}
