import { defineConfig } from '@playwright/test';

const PORT = 4173;
const HOST = '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	timeout: 30_000,
	expect: {
		timeout: 7_500,
	},
	retries: process.env.CI ? 2 : 0,
	reporter: 'list',
	use: {
		baseURL: BASE_URL,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
		viewport: {
			width: 1440,
			height: 980,
		},
	},
	webServer: {
		command: `python3 -m http.server ${PORT} --bind ${HOST}`,
		url: BASE_URL,
		reuseExistingServer: !process.env.CI,
		timeout: 15_000,
		cwd: '.',
	},
	projects: [
		{
			name: 'chromium',
			use: {
				browserName: 'chromium',
			},
		},
		{
			name: 'firefox',
			use: {
				browserName: 'firefox',
			},
		},
	],
});
