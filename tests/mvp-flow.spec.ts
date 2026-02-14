/**
 * MVP End-to-End Test Suite
 *
 * Tests the complete user flow:
 * 1. Landing on Learn page
 * 2. Starting and completing Lesson 1
 * 3. SRS cards being created
 * 4. Reviewing SRS cards
 * 5. Lesson 2 unlocking
 * 6. Resetting progress
 */

import { test, expect } from '@playwright/test';

test.describe('LanguageLoader MVP', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/languageloader-fe/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should show navigation on all pages', async ({ page }) => {
    await page.goto('/languageloader-fe/learn');

    // Check navbar exists
    await expect(page.locator('nav, .navbar')).toBeVisible();

    // Check navigation links in navbar
    const navbar = page.locator('.navbar');
    await expect(navbar.getByRole('link', { name: 'Learn' })).toBeVisible();
    await expect(navbar.getByRole('link', { name: 'Review' })).toBeVisible();
    await expect(navbar.getByRole('link', { name: 'Settings' })).toBeVisible();
  });

  test('should redirect root to /learn', async ({ page }) => {
    await page.goto('/languageloader-fe/');
    await expect(page).toHaveURL(/\/learn/);
  });

  test('should show 3 lessons with correct lock states', async ({ page }) => {
    await page.goto('/languageloader-fe/learn');

    // Should see 3 lessons
    await expect(page.getByText('Lesson 1')).toBeVisible();
    await expect(page.getByText('Lesson 2')).toBeVisible();
    await expect(page.getByText('Lesson 3')).toBeVisible();

    // Lesson 1 should be unlocked
    const lesson1Card = page.locator('.card').filter({ hasText: 'Lesson 1' });
    await expect(lesson1Card.getByText('Start Lesson')).toBeVisible();

    // Lessons 2 and 3 should be locked
    const lesson2Card = page.locator('.card').filter({ hasText: 'Lesson 2' });
    await expect(lesson2Card.getByRole('button', { name: 'Locked' })).toBeVisible();

    const lesson3Card = page.locator('.card').filter({ hasText: 'Lesson 3' });
    await expect(lesson3Card.getByRole('button', { name: 'Locked' })).toBeVisible();
  });

  test('should show no SRS review CTA initially', async ({ page }) => {
    await page.goto('/languageloader-fe/learn');

    // Should not see review CTA when no cards are due
    await expect(page.getByText(/cards due for review/)).not.toBeVisible();
  });

  test('complete lesson 1 flow', async ({ page }) => {
    await page.goto('/languageloader-fe/learn');

    // Click Start Lesson for Lesson 1
    await page.locator('.card').filter({ hasText: 'Lesson 1' }).getByText('Start Lesson').click();

    // Should show intro screen
    await expect(page.getByText('Deixis and Singular Nouns')).toBeVisible();
    await expect(page.getByText('Learning Objectives:')).toBeVisible();

    // Check stats
    const stats = page.locator('.stats');
    await expect(stats.getByText('Exercises')).toBeVisible();
    await expect(stats.getByText('6', { exact: true })).toBeVisible(); // 6 exercises
    await expect(stats.getByText('New Cards')).toBeVisible();
    await expect(stats.getByText('12', { exact: true })).toBeVisible(); // 12 SRS cards

    // Click Start Lesson
    await page.getByText('Start Lesson').click();

    // Should see exercise 1 of 6
    await expect(page.getByText('Exercise 1 of 6')).toBeVisible();

    // Complete all 6 exercises
    for (let i = 0; i < 6; i++) {
      // Wait for exercise to load
      await page.waitForTimeout(1000);

      const submitButton = page.getByRole('button', { name: 'Check Answer' });
      const isWordBank = await submitButton.isVisible({ timeout: 500 }).catch(() => false);

      if (isWordBank) {
        // Word bank exercise - click words in construction zone
        const wordButtons = page.locator('.btn-outline[lang="ps"]');
        const count = await wordButtons.count();
        // Click all words in order
        for (let j = 0; j < count; j++) {
          await wordButtons.first().click();
          await page.waitForTimeout(300);
        }
        await submitButton.click();
      } else {
        // Image match or gap fill - click first clickable option
        // Look for cards or choice buttons
        const imageCards = page.locator('.card.cursor-pointer, .btn[lang="ps"]');
        const count = await imageCards.count();
        if (count > 0) {
          await imageCards.first().click();
        }
      }

      // Wait for feedback and auto-advance
      await page.waitForTimeout(2500);
    }

    // Should see completion screen
    await expect(page.getByText('Lesson Complete!')).toBeVisible();
    await expect(page.getByText('Exercises Completed')).toBeVisible();
    await expect(page.getByText('Cards Added to Review')).toBeVisible();
  });

  test('after completing lesson 1, should unlock lesson 2 and show SRS CTA', async ({ page }) => {
    // Complete lesson 1 first
    await page.goto('/languageloader-fe/learn');
    await page.locator('.card').filter({ hasText: 'Lesson 1' }).getByText('Start Lesson').click();
    await page.getByText('Start Lesson').click();

    // Quick complete (click through exercises)
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(1000);

      const submitButton = page.getByRole('button', { name: 'Check Answer' });
      const isWordBank = await submitButton.isVisible({ timeout: 500 }).catch(() => false);

      if (isWordBank) {
        const wordButtons = page.locator('.btn-outline[lang="ps"]');
        const count = await wordButtons.count();
        for (let j = 0; j < count; j++) {
          await wordButtons.first().click();
          await page.waitForTimeout(300);
        }
        await submitButton.click();
      } else {
        const imageCards = page.locator('.card.cursor-pointer, .btn[lang="ps"]');
        const count = await imageCards.count();
        if (count > 0) {
          await imageCards.first().click();
        }
      }

      await page.waitForTimeout(2500);
    }

    // Go back to learn page
    await page.getByText('Back to Lessons').click();

    // Lesson 1 should show Completed badge
    const lesson1Card = page.locator('.card').filter({ hasText: 'Lesson 1' });
    await expect(lesson1Card.getByText('Completed')).toBeVisible();

    // Lesson 2 should now be unlocked
    const lesson2Card = page.locator('.card').filter({ hasText: 'Lesson 2' });
    await expect(lesson2Card.getByText('Start Lesson')).toBeVisible();

    // Lesson 3 should still be locked
    const lesson3Card = page.locator('.card').filter({ hasText: 'Lesson 3' });
    await expect(lesson3Card.getByRole('button', { name: 'Locked' })).toBeVisible();

    // Should see SRS review CTA
    await expect(page.getByText(/cards due for review/)).toBeVisible();
  });

  test('review page should show cards after lesson completion', async ({ page }) => {
    // Complete lesson 1
    await page.goto('/languageloader-fe/learn');
    await page.locator('.card').filter({ hasText: 'Lesson 1' }).getByText('Start Lesson').click();
    await page.getByText('Start Lesson').click();

    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(1000);

      const submitButton = page.getByRole('button', { name: 'Check Answer' });
      const isWordBank = await submitButton.isVisible({ timeout: 500 }).catch(() => false);

      if (isWordBank) {
        const wordButtons = page.locator('.btn-outline[lang="ps"]');
        const count = await wordButtons.count();
        for (let j = 0; j < count; j++) {
          await wordButtons.first().click();
          await page.waitForTimeout(300);
        }
        await submitButton.click();
      } else {
        const imageCards = page.locator('.card.cursor-pointer, .btn[lang="ps"]');
        const count = await imageCards.count();
        if (count > 0) {
          await imageCards.first().click();
        }
      }

      await page.waitForTimeout(2500);
    }

    // Wait for completion screen
    await expect(page.getByText('Lesson Complete!')).toBeVisible({ timeout: 10000 });

    // Navigate to review page
    await page.goto('/languageloader-fe/review');

    // Should see cards due
    await expect(page.getByText(/Card 1 of/)).toBeVisible();

    // Should see Pashto text (RTL)
    const pashtoText = page.locator('[dir="rtl"][lang="ps"]');
    await expect(pashtoText.first()).toBeVisible();

    // Should see Show Answer button
    await expect(page.getByText('Show Answer')).toBeVisible();

    // Click Show Answer
    await page.getByText('Show Answer').click();

    // Should see rating buttons
    await expect(page.getByText('Again')).toBeVisible();
    await expect(page.getByText('Hard')).toBeVisible();
    await expect(page.getByText('Good')).toBeVisible();
    await expect(page.getByText('Easy')).toBeVisible();

    // Grade the card
    await page.getByText('Good').click();

    // Should move to next card or show completion
    await page.waitForTimeout(500);
  });

  test('settings page should have reset button', async ({ page }) => {
    await page.goto('/languageloader-fe/settings');

    // Should see settings page
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByText('Data Management')).toBeVisible();

    // Should see reset button
    await expect(page.getByText('Reset All Progress')).toBeVisible();
    const resetButton = page.getByText('Reset', { exact: true });
    await expect(resetButton).toBeVisible();

    // Click reset button
    await resetButton.click();

    // Should show confirmation modal
    await expect(page.getByText('Reset All Progress?')).toBeVisible();
    await expect(page.getByText('This action cannot be undone')).toBeVisible();

    // Cancel
    await page.getByText('Cancel').click();

    // Modal should close
    await expect(page.getByText('Reset All Progress?')).not.toBeVisible();
  });

  test('reset progress should clear all data', async ({ page }) => {
    // Complete lesson 1
    await page.goto('/languageloader-fe/learn');
    await page.locator('.card').filter({ hasText: 'Lesson 1' }).getByText('Start Lesson').click();
    await page.getByText('Start Lesson').click();

    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(500);
      const buttons = page.locator('button');
      const visibleButtons = await buttons.all();
      for (const btn of visibleButtons) {
        if (await btn.isVisible()) {
          try {
            await btn.click({ timeout: 500 });
            break;
          } catch {
            continue;
          }
        }
      }
      await page.waitForTimeout(1500);
    }

    // Go to settings
    await page.goto('/languageloader-fe/settings');

    // Click reset
    await page.getByText('Reset', { exact: true }).click();
    await page.getByText('Reset Everything').click();

    // Wait for page reload
    await page.waitForURL(/\/learn/);
    await page.waitForTimeout(1000);

    // Lesson 1 should no longer be completed
    const lesson1Card = page.locator('.card').filter({ hasText: 'Lesson 1' });
    await expect(lesson1Card.getByText('Completed')).not.toBeVisible();
    await expect(lesson1Card.getByText('Start Lesson')).toBeVisible();

    // No SRS cards should be due
    await expect(page.getByText(/cards due for review/)).not.toBeVisible();
  });
});
