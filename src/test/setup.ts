export {};

// Import jest-dom only when the test runner's `expect` is available.
// Avoid top-level await so TypeScript build doesn't fail.
if (typeof (globalThis as any).expect !== "undefined") {
	// @ts-ignore - dynamic import's type definitions are global-only and cause TS2306
	void import("@testing-library/jest-dom");
} else {
	// If `expect` is not yet defined, defer import to the next tick.
	setTimeout(() => {
		// @ts-ignore - dynamic import's type definitions are global-only and cause TS2306
		void import("@testing-library/jest-dom").catch(() => {});
	}, 0);
}
