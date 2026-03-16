import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { useProjectsStore } from '../../../stores/projects'
import { useTasksStore } from '../../../stores/tasks'
import TaskSelector from '../../../components/timer/TaskSelector.vue'
import type { Project, Task } from '../../../types/index'

vi.mock('../../../services/tauriApi', () => ({
  api: {
    getProjects: vi.fn(),
    getTasks: vi.fn(),
  },
}))

function makeProject(id: number, name: string, archived = 0): Project {
  return {
    id,
    name,
    color: '#6366f1',
    archived,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }
}

function makeTask(id: number, projectId: number, name: string, archived = 0): Task {
  return {
    id,
    projectId,
    name,
    archived,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }
}

/**
 * Stub AutoComplete so we can trigger item-select without the PrimeVue plugin.
 * It exposes a `triggerItemSelect` helper via the component's emits.
 */
const AutoCompleteStub = {
  props: ['modelValue', 'suggestions', 'optionLabel', 'placeholder', 'dropdown', 'forceSelection'],
  emits: ['update:modelValue', 'complete', 'item-select'],
  template: `
    <div class="autocomplete-stub">
      <input
        class="autocomplete-input"
        :placeholder="placeholder"
        @input="$emit('complete', { query: $event.target.value })"
      />
      <ul class="autocomplete-suggestions">
        <li
          v-for="(s, i) in suggestions"
          :key="i"
          class="autocomplete-option"
          :data-label="s.label"
          @click="$emit('item-select', { value: s })"
        >{{ s.label }}</li>
      </ul>
    </div>
  `,
}

function mountSelector(
  projects: Project[] = [],
  tasksByProject: Record<number, Task[]> = {},
) {
  return mount(TaskSelector, {
    global: {
      plugins: [
        createTestingPinia({
          stubActions: true,
          initialState: {
            projects: { projects, loading: false, error: null },
            tasks: { tasksByProject, loading: false, error: null },
          },
        }),
      ],
      stubs: {
        AutoComplete: AutoCompleteStub,
      },
    },
  })
}

describe('TaskSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // Mount behaviour
  // -------------------------------------------------------------------------

  it('calls fetchProjects on mount when projects list is empty', () => {
    mountSelector([])
    const projectsStore = useProjectsStore()
    expect(projectsStore.fetchProjects).toHaveBeenCalledTimes(1)
  })

  it('does not call fetchProjects when projects are already loaded', () => {
    mountSelector([makeProject(1, 'Alpha')])
    const projectsStore = useProjectsStore()
    expect(projectsStore.fetchProjects).not.toHaveBeenCalled()
  })

  it('calls fetchTasks for each non-archived project whose tasks are not yet loaded', async () => {
    const projects = [makeProject(1, 'Alpha'), makeProject(2, 'Beta'), makeProject(3, 'Old', 1)]
    mountSelector(projects, {})
    await nextTick()

    const tasksStore = useTasksStore()
    // Project 3 is archived — only 1 and 2 should trigger a fetch
    expect(tasksStore.fetchTasks).toHaveBeenCalledWith(1)
    expect(tasksStore.fetchTasks).toHaveBeenCalledWith(2)
    expect(tasksStore.fetchTasks).not.toHaveBeenCalledWith(3)
  })

  it('does not call fetchTasks for a project whose tasks are already cached', async () => {
    const projects = [makeProject(1, 'Alpha')]
    const tasksByProject = { 1: [makeTask(10, 1, 'Write tests')] }
    mountSelector(projects, tasksByProject)
    await nextTick()

    const tasksStore = useTasksStore()
    expect(tasksStore.fetchTasks).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Options filtering
  // -------------------------------------------------------------------------

  it('shows all task options when AutoComplete fires complete with empty query', async () => {
    const projects = [makeProject(1, 'Alpha')]
    const tasksByProject = {
      1: [makeTask(10, 1, 'Fix bug'), makeTask(11, 1, 'Write docs')],
    }
    const wrapper = mountSelector(projects, tasksByProject)
    await nextTick()

    // Trigger a search with empty string to populate filteredOptions
    const input = wrapper.find('.autocomplete-input')
    await input.setValue('')
    await input.trigger('input')
    await nextTick()

    const options = wrapper.findAll('.autocomplete-option')
    expect(options).toHaveLength(2)
  })

  it('filters options by task name substring', async () => {
    const projects = [makeProject(1, 'Alpha')]
    const tasksByProject = {
      1: [makeTask(10, 1, 'Fix bug'), makeTask(11, 1, 'Write docs')],
    }
    const wrapper = mountSelector(projects, tasksByProject)
    await nextTick()

    const input = wrapper.find('.autocomplete-input')
    await input.setValue('fix')
    await input.trigger('input')
    await nextTick()

    const options = wrapper.findAll('.autocomplete-option')
    expect(options).toHaveLength(1)
    expect(options[0].attributes('data-label')).toContain('Fix bug')
  })

  it('filters options by project name substring', async () => {
    const projects = [makeProject(1, 'Alpha'), makeProject(2, 'Beta')]
    const tasksByProject = {
      1: [makeTask(10, 1, 'Task A')],
      2: [makeTask(11, 2, 'Task B')],
    }
    const wrapper = mountSelector(projects, tasksByProject)
    await nextTick()

    const input = wrapper.find('.autocomplete-input')
    await input.setValue('beta')
    await input.trigger('input')
    await nextTick()

    const options = wrapper.findAll('.autocomplete-option')
    expect(options).toHaveLength(1)
    expect(options[0].attributes('data-label')).toContain('Beta')
  })

  it('excludes tasks from archived projects', async () => {
    const projects = [makeProject(1, 'Active'), makeProject(2, 'Archived', 1)]
    const tasksByProject = {
      1: [makeTask(10, 1, 'Active task')],
      2: [makeTask(11, 2, 'Archived task')],
    }
    const wrapper = mountSelector(projects, tasksByProject)
    await nextTick()

    const input = wrapper.find('.autocomplete-input')
    await input.setValue('')
    await input.trigger('input')
    await nextTick()

    const labels = wrapper.findAll('.autocomplete-option').map((o) => o.attributes('data-label'))
    expect(labels.some((l) => l?.includes('Active task'))).toBe(true)
    expect(labels.some((l) => l?.includes('Archived task'))).toBe(false)
  })

  it('excludes archived tasks even if their project is active', async () => {
    const projects = [makeProject(1, 'Alpha')]
    const tasksByProject = {
      1: [makeTask(10, 1, 'Active task'), makeTask(11, 1, 'Old task', 1)],
    }
    const wrapper = mountSelector(projects, tasksByProject)
    await nextTick()

    const input = wrapper.find('.autocomplete-input')
    await input.setValue('')
    await input.trigger('input')
    await nextTick()

    const labels = wrapper.findAll('.autocomplete-option').map((o) => o.attributes('data-label'))
    expect(labels.some((l) => l?.includes('Active task'))).toBe(true)
    expect(labels.some((l) => l?.includes('Old task'))).toBe(false)
  })

  // -------------------------------------------------------------------------
  // Emit
  // -------------------------------------------------------------------------

  it('emits "select" with the Task object when an option is chosen', async () => {
    const task = makeTask(10, 1, 'Fix bug')
    const projects = [makeProject(1, 'Alpha')]
    const tasksByProject = { 1: [task] }
    const wrapper = mountSelector(projects, tasksByProject)
    await nextTick()

    // Populate filteredOptions first
    const input = wrapper.find('.autocomplete-input')
    await input.setValue('')
    await input.trigger('input')
    await nextTick()

    // Click the first rendered option to trigger item-select
    await wrapper.find('.autocomplete-option').trigger('click')
    await nextTick()

    const emitted = wrapper.emitted('select')
    expect(emitted).toBeDefined()
    expect(emitted![0][0]).toEqual(task)
  })
})
