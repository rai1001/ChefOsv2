'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import type { Workflow, WorkflowDetail, WorkflowTask } from '../types'

export function useWorkflows() {
  const { data: hotel } = useActiveHotel()

  return useQuery<Workflow[]>({
    queryKey: ['workflows', hotel?.hotel_id],
    enabled: !!hotel,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('hotel_id', hotel!.hotel_id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Workflow[]
    },
  })
}

export function useEventWorkflow(eventId?: string) {
  const { data: hotel } = useActiveHotel()

  return useQuery<Workflow | null>({
    queryKey: ['event-workflow', hotel?.hotel_id, eventId],
    enabled: !!hotel && !!eventId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('hotel_id', hotel!.hotel_id)
        .eq('event_id', eventId!)
        .maybeSingle()
      if (error) throw error
      return data as Workflow | null
    },
  })
}

export function useWorkflowDetail(workflowId?: string) {
  const { data: hotel } = useActiveHotel()

  return useQuery<WorkflowDetail | null>({
    queryKey: ['workflow-detail', hotel?.hotel_id, workflowId],
    enabled: !!hotel && !!workflowId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_workflow_detail', {
        p_hotel_id: hotel!.hotel_id,
        p_workflow_id: workflowId!,
      })
      if (error) throw error
      return data as WorkflowDetail | null
    },
  })
}

export function useWorkflowTasks(workflowId?: string) {
  const { data: hotel } = useActiveHotel()

  return useQuery<WorkflowTask[]>({
    queryKey: ['workflow-tasks', hotel?.hotel_id, workflowId],
    enabled: !!hotel && !!workflowId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('workflow_tasks')
        .select('*')
        .eq('hotel_id', hotel!.hotel_id)
        .eq('workflow_id', workflowId!)
        .order('sort_order')
      if (error) throw error
      return data as WorkflowTask[]
    },
  })
}

export function useGenerateEventWorkflow() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (eventId: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('generate_event_workflow', {
        p_hotel_id: hotel!.hotel_id,
        p_event_id: eventId,
      })
      if (error) throw error
      return data as string // workflow_id
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      queryClient.invalidateQueries({ queryKey: ['event-workflow', hotel?.hotel_id, eventId] })
    },
  })
}

export function useAssignWorkflowTask() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: { task_id: string; user_id: string }) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('assign_workflow_task', {
        p_hotel_id: hotel!.hotel_id,
        p_task_id: input.task_id,
        p_user_id: input.user_id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['workflow-detail'] })
    },
  })
}

export function useStartWorkflowTask() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (taskId: string) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('start_workflow_task', {
        p_hotel_id: hotel!.hotel_id,
        p_task_id: taskId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['workflow-detail'] })
    },
  })
}

export function useBlockWorkflowTask() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: { task_id: string; reason: string }) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('block_workflow_task', {
        p_hotel_id: hotel!.hotel_id,
        p_task_id: input.task_id,
        p_reason: input.reason,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['workflow-detail'] })
    },
  })
}

export function useCompleteWorkflowTask() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (input: { task_id: string; actual_minutes?: number }) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('complete_workflow_task', {
        p_hotel_id: hotel!.hotel_id,
        p_task_id: input.task_id,
        p_actual_minutes: input.actual_minutes ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['workflow-detail'] })
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })
}

export function useGenerateRecurringTasks() {
  const queryClient = useQueryClient()
  const { data: hotel } = useActiveHotel()

  return useMutation({
    mutationFn: async (date?: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('generate_tasks_from_recurring_templates', {
        p_hotel_id: hotel!.hotel_id,
        p_date: date ?? new Date().toISOString().slice(0, 10),
      })
      if (error) throw error
      return data as number // count of tasks created
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      queryClient.invalidateQueries({ queryKey: ['workflow-tasks'] })
    },
  })
}
