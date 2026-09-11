import {expect} from '@playwright/test';

export function selectTrigger(scope, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return scope.getByRole('button', {name: new RegExp(`(?:^| )${escaped}$`)});
}

export async function chooseOption(trigger, label) {
  await trigger.click();
  await trigger.page().getByRole('option', {name: label, exact: true}).click();
  await expect(trigger).toContainText(label);
}
