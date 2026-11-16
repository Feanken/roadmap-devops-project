// Fills the <datalist> behind the task input with the labels used most recently,
// so a repeat task is one tap instead of retyping it.

import { $ } from '../dom.js';

export function createTaskSuggestions() {
  const list = $('task-suggestions');
  let lastKey = '';

  return {
    render(tasks) {
      const key = tasks.join('\n');
      if (key === lastKey) return;
      lastKey = key;
      list.replaceChildren(
        ...tasks.map((task) => {
          const option = document.createElement('option');
          option.value = task;
          return option;
        }),
      );
    },
  };
}
