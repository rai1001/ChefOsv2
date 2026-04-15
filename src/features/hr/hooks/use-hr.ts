'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  Personnel,
  PersonnelRole,
  ContractType,
  ShiftDefinition,
  ShiftType,
  ScheduleRule,
  ScheduleAssignment,
  ScheduleStatus,
} from '../types'

const supabase = createClient()

// ──────────────────────────────────────────
// Query keys
// ──────────────────────────────────────────

export const hrKeys = {
  personnel:    (hotelId: string) => ['hr', 'personnel', hotelId] as const,
  shifts:       (hotelId: string) => ['hr', 'shifts', hotelId] as const,
  rules:        (hotelId: string) => ['hr', 'rules', hotelId] as const,
  assignments:  (hotelId: string, from: string, to: string) =>
                  ['hr', 'assignments', hotelId, from, to] as const,
}

// ──────────────────────────────────────────
// Personal
// ──────────────────────────────────────────

export function usePersonnel(hotelId: string, activeOnly = false) {
  return useQuery({
    queryKey: hrKeys.personnel(hotelId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_personnel', {
        p_hotel_id:   hotelId,
        p_active_only: activeOnly,
      })
      if (error) throw error
      return (data ?? []) as Personnel[]
    },
    enabled: !!hotelId,
  })
}

export function useCreatePersonnel(hotelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      name: string
      role: PersonnelRole
      contract_type?: ContractType
      weekly_hours?: number
      notes?: string
    }) => {
      const { data, error } = await supabase.rpc('create_personnel', {
        p_hotel_id:      hotelId,
        p_name:          input.name,
        p_role:          input.role,
        p_contract_type: input.contract_type ?? 'indefinido',
        p_weekly_hours:  input.weekly_hours ?? 40,
        p_notes:         input.notes ?? null,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hrKeys.personnel(hotelId) }),
  })
}

export function useUpdatePersonnel(hotelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      name?: string
      role?: PersonnelRole
      contract_type?: ContractType
      weekly_hours?: number
      active?: boolean
      notes?: string
    }) => {
      const { error } = await supabase.rpc('update_personnel', {
        p_id:            input.id,
        p_name:          input.name          ?? null,
        p_role:          input.role          ?? null,
        p_contract_type: input.contract_type ?? null,
        p_weekly_hours:  input.weekly_hours  ?? null,
        p_active:        input.active        ?? null,
        p_notes:         input.notes         ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hrKeys.personnel(hotelId) }),
  })
}

// ──────────────────────────────────────────
// Turnos (shift definitions)
// ──────────────────────────────────────────

export function useShiftDefinitions(hotelId: string, activeOnly = false) {
  return useQuery({
    queryKey: hrKeys.shifts(hotelId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_shift_definitions', {
        p_hotel_id:    hotelId,
        p_active_only: activeOnly,
      })
      if (error) throw error
      return (data ?? []) as ShiftDefinition[]
    },
    enabled: !!hotelId,
  })
}

export function useCreateShiftDefinition(hotelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      name: string
      start_time: string
      end_time: string
      shift_type?: ShiftType
    }) => {
      const { data, error } = await supabase.rpc('create_shift_definition', {
        p_hotel_id:   hotelId,
        p_name:       input.name,
        p_start_time: input.start_time,
        p_end_time:   input.end_time,
        p_shift_type: input.shift_type ?? 'normal',
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hrKeys.shifts(hotelId) }),
  })
}

export function useUpdateShiftDefinition(hotelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      name?: string
      start_time?: string
      end_time?: string
      shift_type?: ShiftType
      active?: boolean
    }) => {
      const { error } = await supabase.rpc('update_shift_definition', {
        p_id:         input.id,
        p_name:       input.name       ?? null,
        p_start_time: input.start_time ?? null,
        p_end_time:   input.end_time   ?? null,
        p_shift_type: input.shift_type ?? null,
        p_active:     input.active     ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hrKeys.shifts(hotelId) }),
  })
}

// ──────────────────────────────────────────
// Reglas de horario
// ──────────────────────────────────────────

export function useScheduleRules(hotelId: string) {
  return useQuery({
    queryKey: hrKeys.rules(hotelId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_schedule_rules', {
        p_hotel_id: hotelId,
      })
      if (error) throw error
      return (data ?? []) as ScheduleRule[]
    },
    enabled: !!hotelId,
  })
}

export function useCreateScheduleRule(hotelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      role: PersonnelRole
      days_of_week: number[]
      shift_id: string
      min_persons?: number
      max_persons?: number
      priority?: 'normal' | 'alta'
    }) => {
      const { data, error } = await supabase.rpc('create_schedule_rule', {
        p_hotel_id:     hotelId,
        p_role:         input.role,
        p_days_of_week: input.days_of_week,
        p_shift_id:     input.shift_id,
        p_min_persons:  input.min_persons ?? 1,
        p_max_persons:  input.max_persons ?? null,
        p_priority:     input.priority    ?? 'normal',
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hrKeys.rules(hotelId) }),
  })
}

export function useUpdateScheduleRule(hotelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      active?: boolean
      min_persons?: number
      max_persons?: number
      priority?: 'normal' | 'alta'
    }) => {
      const { error } = await supabase.rpc('update_schedule_rule', {
        p_id:          input.id,
        p_active:      input.active       ?? null,
        p_min_persons: input.min_persons  ?? null,
        p_max_persons: input.max_persons  ?? null,
        p_priority:    input.priority     ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hrKeys.rules(hotelId) }),
  })
}

export function useDeleteScheduleRule(hotelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('delete_schedule_rule', { p_id: id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hrKeys.rules(hotelId) }),
  })
}

// ──────────────────────────────────────────
// Asignaciones del cuadrante
// ──────────────────────────────────────────

export function useScheduleAssignments(hotelId: string, dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: hrKeys.assignments(hotelId, dateFrom, dateTo),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_schedule_assignments', {
        p_hotel_id:  hotelId,
        p_date_from: dateFrom,
        p_date_to:   dateTo,
      })
      if (error) throw error
      return (data ?? []) as ScheduleAssignment[]
    },
    enabled: !!hotelId && !!dateFrom && !!dateTo,
  })
}

export function useGenerateMonthlySchedule(hotelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { year: number; month: number }) => {
      const { data, error } = await supabase.rpc('generate_monthly_schedule', {
        p_hotel_id: hotelId,
        p_year:     input.year,
        p_month:    input.month,
      })
      if (error) throw error
      return data as number  // número de asignaciones creadas
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr', 'assignments', hotelId] }),
  })
}

export function useUpdateAssignment(hotelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      shift_id?: string
      status?: ScheduleStatus
      notes?: string
    }) => {
      const { error } = await supabase.rpc('update_assignment', {
        p_id:       input.id,
        p_shift_id: input.shift_id ?? null,
        p_status:   input.status   ?? null,
        p_notes:    input.notes    ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr', 'assignments', hotelId] }),
  })
}

export function useDeleteAssignment(hotelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('delete_assignment', { p_id: id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr', 'assignments', hotelId] }),
  })
}
