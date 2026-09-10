import {expect} from '@playwright/test';

export async function expectAccount(page, email) {
  await page.getByRole('button', {name: 'Your account', exact: true}).click();
  await expect(page.getByText(email, {exact: true})).toBeVisible();
  await page.keyboard.press('Escape');
}

export async function signOut(page) {
  const account = page.getByRole('button', {name: 'Your account', exact: true});
  if (await account.isVisible()) {
    await account.click();
    await page.getByRole('menuitem', {name: 'Sign out', exact: true}).click();
  } else {
    await page.getByRole('button', {name: 'Sign out', exact: true}).click();
  }
}
