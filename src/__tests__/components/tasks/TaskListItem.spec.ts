import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TaskListItem from '../../../components/tasks/TaskListItem.vue'
import type { Task } from '../../../types/index'

// Stubs for PrimeVue components
const stubs = {
  Button: {
    props: ['label', 'icon', 'size', 'text', 'rounded', 'severity', 'ariaLabel'],
    emits: ['click'],
    template: `<button :aria-label="ariaLabel" :data-label="label" class="btn-stub" @click="$emit('click')">{{ label }}</button>`,
  },
  Tag: {
    props: ['value', 'severity', 'class'],
    template: `<span class="tag-stub" :data-value="value">{{ value }}</span>`,
  },
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    projectId: 10,
    name: 'My Task',
    archived: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function mountItem(task: Task) {
  return mount(TaskListItem, {
    props: { task },
    global: { stubs },
  })
}

describe('TaskListItem', () => {
  beforeEach(() => {
    vi.clearAllMocks?.()
  })

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  it('renders the task name', () => {
    const wrapper = mountItem(makeTask({ name: 'Write tests' }))
    expect(wrapper.find('.task-list-item__name').text()).toBe('Write tests')
  })

  it('shows the Archived tag when task.archived is 1', () => {
    const wrapper = mountItem(makeTask({ archived: 1 }))
    const tag = wrapper.find('.tag-stub')
    expect(tag.exists()).toBe(true)
    expect(tag.attributes('data-value')).toBe('Archived')
  })

  it('does not show the Archived tag when task.archived is 0', () => {
    const wrapper = mountItem(makeTask({ archived: 0 }))
    expect(wrapper.find('.tag-stub').exists()).toBe(false)
  })

  it('hides the archive button for archived tasks (archived === 1)', () => {
    const wrapper = mountItem(makeTask({ archived: 1 }))
    const archiveBtn = wrapper
      .findAll('.btn-stub')
      .find(b => b.attributes('aria-label') === 'Archive task')
    expect(archiveBtn).toBeUndefined()
  })

  it('shows the archive button for active tasks (archived === 0)', () => {
    const wrapper = mountItem(makeTask({ archived: 0 }))
    const archiveBtn = wrapper
      .findAll('.btn-stub')
      .find(b => b.attributes('aria-label') === 'Archive task')
    expect(archiveBtn).toBeDefined()
  })

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  it('emits edit event with the task when the edit button is clicked', async () => {
    const task = makeTask({ id: 5, name: 'Edit Me' })
    const wrapper = mountItem(task)
    const editBtn = wrapper
      .findAll('.btn-stub')
      .find(b => b.attributes('aria-label') === 'Edit task')
    await editBtn!.trigger('click')
    expect(wrapper.emitted('edit')).toHaveLength(1)
    expect(wrapper.emitted('edit')![0]).toEqual([task])
  })

  it('emits archive event with task id when the archive button is clicked', async () => {
    const task = makeTask({ id: 7, archived: 0 })
    const wrapper = mountItem(task)
    const archiveBtn = wrapper
      .findAll('.btn-stub')
      .find(b => b.attributes('aria-label') === 'Archive task')
    await archiveBtn!.trigger('click')
    expect(wrapper.emitted('archive')).toHaveLength(1)
    expect(wrapper.emitted('archive')![0]).toEqual([7])
  })

  // ---------------------------------------------------------------------------
  // Delete flow (direct emit)
  // ---------------------------------------------------------------------------

  it('emits delete event with task id when the delete button is clicked', async () => {
    const task = makeTask({ id: 42 })
    const wrapper = mountItem(task)
    const deleteBtn = wrapper
      .findAll('.btn-stub')
      .find(b => b.attributes('aria-label') === 'Delete task')
    await deleteBtn!.trigger('click')
    expect(wrapper.emitted('delete')).toHaveLength(1)
    expect(wrapper.emitted('delete')![0]).toEqual([42])
  })
})
