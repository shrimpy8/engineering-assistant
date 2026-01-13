import { test, expect } from '@playwright/test';

/**
 * E2E tests for the chat workflow
 * Based on PRD v1.4 Section 13.4
 */

test.describe('Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays empty state when no messages', async ({ page }) => {
    // Should show welcome message
    await expect(page.getByText('Start a conversation')).toBeVisible();
    await expect(page.getByText('Ask questions about your codebase')).toBeVisible();
  });

  test('chat input is present and functional', async ({ page }) => {
    const input = page.getByTestId('chat-input');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', 'Ask about your codebase...');
  });

  test('send button is disabled when input is empty', async ({ page }) => {
    const sendButton = page.getByTestId('send-button');
    await expect(sendButton).toBeDisabled();
  });

  test('send button enables when input has text', async ({ page }) => {
    const input = page.getByTestId('chat-input');
    const sendButton = page.getByTestId('send-button');

    await input.fill('Hello');
    await expect(sendButton).toBeEnabled();
  });

  test('shows warning when repo path not configured', async ({ page }) => {
    // Try to send a message without repo path
    const input = page.getByTestId('chat-input');
    await input.fill('Test message');

    // Should show warning about repo path
    await expect(page.getByText('Please configure a repository path')).toBeVisible();
  });
});

test.describe('Settings Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('opens settings panel on button click', async ({ page }) => {
    await page.getByTestId('settings-button').click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  });

  test('closes settings panel on escape key', async ({ page }) => {
    await page.getByTestId('settings-button').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('repo path input is present', async ({ page }) => {
    await page.getByTestId('settings-button').click();
    await expect(page.getByTestId('repo-path-input')).toBeVisible();
  });

  test('settings panel has model selector', async ({ page }) => {
    await page.getByTestId('settings-button').click();
    await expect(page.getByText('Model')).toBeVisible();
  });

  test('settings panel has temperature slider', async ({ page }) => {
    await page.getByTestId('settings-button').click();
    await expect(page.getByText('Temperature')).toBeVisible();
  });
});

test.describe('Tool Trace Panel', () => {
  test('tool trace panel is visible on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    // Tool trace should be visible
    await expect(page.getByText('Tool Activity')).toBeVisible();
    await expect(page.getByText('No tool activity yet')).toBeVisible();
  });

  test('tool trace panel is hidden on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Desktop panel should not be visible
    const desktopPanel = page.locator('.hidden.lg\\:block');
    await expect(desktopPanel).not.toBeVisible();
  });
});

test.describe('Responsive Layout', () => {
  test('header shows full title on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await expect(page.getByText('Engineering Assistant')).toBeVisible();
  });

  test('header hides title on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    // Title should be hidden on mobile (has hidden sm:inline class)
    const title = page.locator('text=Engineering Assistant');
    await expect(title).not.toBeVisible();
  });
});

test.describe('Keyboard Navigation', () => {
  test('Enter key sends message (when repo configured)', async ({ page }) => {
    await page.goto('/');
    const input = page.getByTestId('chat-input');

    await input.fill('Test message');
    await input.press('Enter');

    // Without repo path, settings should open
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  });

  test('Shift+Enter creates new line', async ({ page }) => {
    await page.goto('/');
    const input = page.getByTestId('chat-input');

    await input.fill('Line 1');
    await input.press('Shift+Enter');
    await input.type('Line 2');

    const value = await input.inputValue();
    expect(value).toContain('\n');
  });
});
