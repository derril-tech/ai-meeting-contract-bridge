import { test, expect } from '@playwright/test';

test.describe('Full Workflow E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000');
    });

    test('complete NDA workflow from upload to export', async ({ page }) => {
        // Upload transcript
        await page.locator('input[type="file"]').setInputFiles({
            name: 'nda-meeting.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from(mockNdaTranscript)
        });

        // Fill meeting details
        await page.fill('input[placeholder*="meeting title"]', 'NDA Discussion - Tech Startup');
        await page.fill('input[type="date"]', '2024-01-15');

        // Submit upload
        await page.click('button:has-text("Upload")');

        // Wait for processing
        await page.waitForSelector('text=Processing your transcript...');
        await page.waitForSelector('text=Transcript processed successfully', { timeout: 30000 });

        // Navigate to decisions view
        await page.click('text=View Decisions');

        // Verify decisions are displayed
        await expect(page.locator('text=Maintain confidentiality')).toBeVisible();
        await expect(page.locator('text=Not disclose confidential')).toBeVisible();
        await expect(page.locator('text=Complete implementation')).toBeVisible();

        // Generate NDA draft
        await page.click('button:has-text("Generate NDA")');

        // Wait for draft generation
        await page.waitForSelector('text=Draft generated successfully', { timeout: 30000 });

        // Navigate to draft editor
        await page.click('text=Edit Draft');

        // Verify contract editor loads
        await expect(page.locator('text=Contract Draft')).toBeVisible();

        // Check placeholders are highlighted
        await expect(page.locator('text=Placeholders: 3 remaining')).toBeVisible();

        // Test QA chat
        await page.click('button[title*="Q&A"]');
        await page.fill('input[placeholder*="Ask a question"]', 'Why is confidentiality important?');
        await page.click('button[type="submit"]');

        // Wait for QA response
        await page.waitForSelector('text=Answer:', { timeout: 10000 });
        await expect(page.locator('text=confidentiality')).toBeVisible();

        // Export as DOCX
        await page.click('button:has-text("Export")');
        await page.click('text=Word Document');

        // Verify download starts
        const downloadPromise = page.waitForEvent('download');
        await page.click('button:has-text("Export")');
        const download = await downloadPromise;

        expect(download.suggestedFilename()).toContain('contract-draft.docx');
    });

    test('complete SoW workflow with multiple deliverables', async ({ page }) => {
        // Upload SoW transcript
        await page.locator('input[type="file"]').setInputFiles({
            name: 'sow-meeting.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from(mockSowTranscript)
        });

        // Fill meeting details
        await page.fill('input[placeholder*="meeting title"]', 'SoW Development Project');
        await page.fill('input[type="date"]', '2024-01-25');

        // Submit upload
        await page.click('button:has-text("Upload")');

        // Wait for processing and decisions
        await page.waitForSelector('text=View Decisions', { timeout: 30000 });
        await page.click('text=View Decisions');

        // Verify deliverables and deadlines
        await expect(page.locator('text=Deliverables:')).toBeVisible();
        await expect(page.locator('text=design mockups')).toBeVisible();
        await expect(page.locator('text=MVP')).toBeVisible();
        await expect(page.locator('text=final release')).toBeVisible();

        // Generate SoW draft
        await page.click('button:has-text("Generate SoW")');

        // Wait for generation
        await page.waitForSelector('text=Edit Draft', { timeout: 30000 });
        await page.click('text=Edit Draft');

        // Verify SoW-specific sections
        await expect(page.locator('text=Scope of Work')).toBeVisible();
        await expect(page.locator('text=Deliverables')).toBeVisible();
        await expect(page.locator('text=Timeline')).toBeVisible();

        // Test placeholder resolution
        await page.click('button:has-text("Resolve Placeholders")');

        // Verify placeholders are filled
        await expect(page.locator('text=Placeholders: 0 remaining')).toBeVisible();

        // Export as PDF
        await page.click('button:has-text("Export")');
        await page.click('text=PDF Document');

        const downloadPromise = page.waitForEvent('download');
        await page.click('button:has-text("Export")');
        const download = await downloadPromise;

        expect(download.suggestedFilename()).toContain('contract-draft.pdf');
    });

    test('visual regression test - contract editor layout', async ({ page }) => {
        // Navigate to a draft
        await page.goto('http://localhost:3000/drafts/test-draft-id');

        // Wait for editor to load
        await page.waitForSelector('text=Contract Draft');

        // Take screenshot for visual comparison
        await page.screenshot({
            path: 'test-results/contract-editor-layout.png',
            fullPage: true
        });

        // Verify key UI elements are present and correctly positioned
        const header = page.locator('h1:has-text("Contract Draft")');
        await expect(header).toBeVisible();

        const editor = page.locator('.ProseMirror');
        await expect(editor).toBeVisible();

        // Check sidebar elements
        await expect(page.locator('text=Placeholders')).toBeVisible();
        await expect(page.locator('text=Deviations')).toBeVisible();
    });

    test('accessibility compliance test', async ({ page }) => {
        await page.goto('http://localhost:3000');

        // Check for ARIA labels
        const uploadButton = page.locator('button[aria-label]');
        await expect(uploadButton).toHaveCount(await page.locator('button').count());

        // Check keyboard navigation
        await page.keyboard.press('Tab');
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeVisible();

        // Check color contrast (basic check)
        const buttons = page.locator('button');
        for (const button of await buttons.all()) {
            const backgroundColor = await button.evaluate(el =>
                window.getComputedStyle(el).backgroundColor
            );
            expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)'); // Should have a background
        }
    });

    test('error handling and recovery', async ({ page }) => {
        // Test invalid file upload
        await page.locator('input[type="file"]').setInputFiles({
            name: 'invalid.exe',
            mimeType: 'application/x-msdownload',
            buffer: Buffer.from('invalid content')
        });

        // Should show error message
        await expect(page.locator('text=Invalid file type')).toBeVisible();

        // Test network error recovery
        await page.route('**/api/meetings/upload', route => route.abort());

        await page.locator('input[type="file"]').setInputFiles({
            name: 'test.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('test content')
        });

        await expect(page.locator('text=Upload failed')).toBeVisible();

        // Test retry functionality
        await page.unroute('**/api/meetings/upload');
        await page.click('button:has-text("Try Again")');

        // Should attempt upload again
        await expect(page.locator('text=Uploading...')).toBeVisible();
    });

    test('performance benchmark - page load times', async ({ page }) => {
        const startTime = Date.now();

        await page.goto('http://localhost:3000');
        await page.waitForLoadState('networkidle');

        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(3000); // Should load in under 3 seconds

        // Test editor page load
        const editorStartTime = Date.now();
        await page.goto('http://localhost:3000/drafts/test-draft-id');
        await page.waitForSelector('text=Contract Draft');

        const editorLoadTime = Date.now() - editorStartTime;
        expect(editorLoadTime).toBeLessThan(5000); // Should load editor in under 5 seconds
    });

    test('mobile responsiveness', async ({ page }) => {
        // Set viewport to mobile size
        await page.setViewportSize({ width: 375, height: 667 });

        await page.goto('http://localhost:3000');

        // Check that upload area is still functional
        const uploadArea = page.locator('[data-testid="upload-area"]');
        await expect(uploadArea).toBeVisible();

        // Check mobile menu if present
        const mobileMenu = page.locator('[data-testid="mobile-menu"]');
        if (await mobileMenu.count() > 0) {
            await expect(mobileMenu).toBeVisible();
        }
    });
});

// Mock transcript data
const mockNdaTranscript = `
[00:00] Alice: Good morning everyone. Today we're discussing the NDA with TechCorp.

[00:15] Bob: The confidentiality period should be 5 years from the date of termination.

[00:30] Alice: Agreed. The receiving party shall not disclose confidential information to third parties without prior written consent.

[01:00] Charlie: What about the governing law? Should we use Delaware law since we're both US companies?

[01:15] Bob: Delaware law makes sense for intellectual property protection.

[01:30] Alice: Also, we need to define what constitutes confidential information - technical data, business plans, customer lists.

[02:00] David: The budget for this project is $150,000 with monthly payments of $12,500.

[02:15] Alice: We should complete the implementation by March 31st, 2024.

[02:30] Bob: I approve the project timeline and budget allocation.

[02:45] Meeting concluded with agreement on all key terms.
`;

const mockSowTranscript = `
[00:00] John: Let's outline the scope of work for the mobile app development.

[00:15] Mary: Deliverables include: design mockups by March 1, MVP by June 1, final release by September 1.

[00:45] John: The budget is $150,000 with 50% upfront payment.

[01:00] Mary: We'll use Agile methodology with bi-weekly sprints.

[01:30] John: Acceptance criteria: all features tested, documentation complete, 95% uptime in staging.

[02:00] David: Timeline is tight but achievable with the proposed milestones.

[02:30] Meeting concluded with detailed scope and deliverables.
`;
