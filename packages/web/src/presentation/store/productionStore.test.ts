import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './useStore';
import type { KanbanTask } from '@/types';

describe('Event Slice Production Logic', () => {
  beforeEach(() => {
    useStore.setState({
      events: [],
      selectedProductionEventId: null,
      productionTasks: {},
    });
  });

  it('should set selectedProductionEventId', () => {
    useStore.getState().setSelectedProductionEventId('event-123');
    expect(useStore.getState().selectedProductionEventId).toBe('event-123');
  });

  it('should set production tasks for an event', () => {
    const tasks: KanbanTask[] = [
      { id: '1', title: 'Task 1', quantity: 10, unit: 'kg', description: 'Desc', status: 'todo' },
    ];
    useStore.getState().setProductionTasks!('event-123', tasks);
    expect(useStore.getState().productionTasks['event-123']).toEqual(tasks);
  });

  it('should update production task status', () => {
    const tasks: KanbanTask[] = [
      { id: '1', title: 'Task 1', quantity: 10, unit: 'kg', description: 'Desc', status: 'todo' },
    ];
    useStore.getState().setProductionTasks!('event-123', tasks);

    useStore.getState().updateTaskStatus('event-123', '1', 'in-progress');

    const updatedTasks = useStore.getState().productionTasks['event-123'];
    expect(updatedTasks[0].status).toBe('in-progress');
  });

  it('should handle updating status for non-existent event gracefully', () => {
    // Should not throw
    useStore.getState().updateTaskStatus('non-existent', '1', 'in-progress');
    expect(useStore.getState().productionTasks['non-existent']).toBeUndefined();
  });

  it('should handle updating status for non-existent task gracefully', () => {
    const tasks: KanbanTask[] = [
      { id: '1', title: 'Task 1', quantity: 10, unit: 'kg', description: 'Desc', status: 'todo' },
    ];
    useStore.getState().setProductionTasks!('event-123', tasks);

    useStore.getState().updateTaskStatus('event-123', '999', 'done');

    const updatedTasks = useStore.getState().productionTasks['event-123'];
    expect(updatedTasks[0].status).toBe('todo'); // Unchanged
  });
});
