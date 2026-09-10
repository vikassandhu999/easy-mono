import {expect} from '@playwright/test';

export async function checkMobileFoundation(page) {
  for (const width of [375, 390, 768, 1280]) {
    await page.setViewportSize({width, height: 812});
    await page.getByLabel('First name', {exact: true}).fill('Kept through preview');
    await page.getByLabel('Email', {exact: true}).fill('layout@example.test');
    const input = page.getByLabel('Email', {exact: true});
    expect(await input.evaluate((element) => getComputedStyle(element).fontSize)).toBe('16px');
    const account = page.getByRole('button', {name: 'Your account', exact: true});
    const business = page.locator('.app-business');
    const businessName = await business.textContent();
    await business.evaluate((element) => {
      element.textContent = 'A very long coaching business name that must remain inside the header';
    });
    expect((await page.locator('.app-header').boundingBox()).height).toBe(width < 768 ? 65 : 73);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await business.evaluate((element, name) => {
      element.textContent = name;
    }, businessName);
    const accountBox = await account.boundingBox();
    expect(accountBox.width).toBeGreaterThanOrEqual(44);
    expect(accountBox.height).toBeGreaterThanOrEqual(44);
    await account.click();
    const signOut = page.getByRole('menuitem', {name: 'Sign out', exact: true});
    await expect(signOut).toBeVisible();
    expect((await signOut.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await page.keyboard.press('Escape');
    await expect(account).toBeFocused();
    const preview = page.getByRole('button', {name: 'Preview intake', exact: true});
    await preview.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(813);
    expect(bounds.width).toBeLessThanOrEqual(width);
    for (const key of ['Tab', 'Tab', 'Shift+Tab']) {
      await page.keyboard.press(key);
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    }
    const body = page.getByRole('region', {name: 'Intake questions', exact: true});
    expect(await body.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
    await page.getByRole('button', {name: 'Close preview', exact: true}).focus();
    await page.keyboard.press('Tab');
    await expect(body).toBeFocused();
    await page.keyboard.press('PageDown');
    await expect.poll(() => body.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await page.keyboard.press('End');
    await expect(body.locator('ol > li').last()).toBeInViewport({ratio: 1});
    await expect(page.getByRole('button', {name: 'Close preview', exact: true})).toBeInViewport();
    await page.screenshot({path: `tests/clients/artifacts/mobile-preview-${width}.png`});
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(preview).toBeFocused();
    await expect(page.getByLabel('First name', {exact: true})).toHaveValue('Kept through preview');
    await expect(input).toHaveValue('layout@example.test');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('main').evaluate((element) => getComputedStyle(element).paddingLeft)).toBe(
      width < 768 ? '20px' : '32px',
    );
    if (width < 768) {
      await page.setViewportSize({width, height: 480});
      await input.focus();
      await input.scrollIntoViewIfNeeded();
      const field = await input.boundingBox();
      const footer = await page.locator('.form-actions').boundingBox();
      expect(field.y).toBeGreaterThanOrEqual(64);
      expect(field.y + field.height).toBeLessThanOrEqual(footer.y);
      await expect(page.getByRole('button', {name: 'Send invitation', exact: true})).toBeInViewport();
    }
    await page.setViewportSize({width, height: 812});
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({path: `tests/clients/artifacts/mobile-invite-${width}.png`, fullPage: true});
    console.log(`Mobile foundation: ${width}px layout, controls, menu, dialog focus and scroll passed.`);
  }
  await page.getByLabel('First name', {exact: true}).fill('');
  await page.getByLabel('Email', {exact: true}).fill('');
  await page.setViewportSize({width: 375, height: 900});
}
