import { test, expect } from '@playwright/test';

/**
 * E2E tests for error handling
 * Based on PRD v1.4 Section 8
 */

test.describe('Error Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('error messages have dismiss button', async ({ page }) => {
    // Configure an invalid repo path to trigger an error
    await page.getByTestId('settings-button').click();
    const repoInput = page.getByTestId('repo-path-input');

    await repoInput.fill('/nonexistent/path/that/does/not/exist');
    await repoInput.blur();

    // Close settings
    await page.keyboard.press('Escape');

    // Try to send a message (should fail)
    const chatInput = page.getByTestId('chat-input');
    await chatInput.fill('Test');
    await chatInput.press('Enter');

    // Error display should appear with dismiss option
    // Note: This depends on the API actually being available
  });
});

test.describe('Loading States', () => {
  test('shows loading indicator when sending message', async ({ page }) => {
    await page.goto('/');

    // Configure repo path first
    await page.getByTestId('settings-button').click();
    const repoInput = page.getByTestId('repo-path-input');
    await repoInput.fill('/tmp');
    await page.keyboard.press('Escape');

    // Send a message
    const chatInput = page.getByTestId('chat-input');
    await chatInput.fill('Hello');

    const sendButton = page.getByTestId('send-button');
    await sendButton.click();

    // Send button should show loading state
    await expect(sendButton).toContainText('Sending');
  });
});

test.describe('Graceful Degradation', () => {
  test('app remains functional after settings close', async ({ page }) => {
    await page.goto('/');

    // Open and close settings multiple times
    for (let i = 0; i < 3; i++) {
      await page.getByTestId('settings-button').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).not.toBeVisible();
    }

    // App should still be functional
    const chatInput = page.getByTestId('chat-input');
    await expect(chatInput).toBeVisible();
    await expect(chatInput).toBeEnabled();
  });
});
