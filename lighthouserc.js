/** @type {import('@lhci/cli').LighthouseConfig} */
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/dashboard'],
      startServerCommand: 'npm run dev',
      startServerReadyPattern: 'Ready in',
      startServerReadyTimeout: 30000,
      numberOfRuns: 1,
      settings: {
        // Simulate mobile device (Moto G4)
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 390,
          height: 844,
          deviceScaleFactor: 3,
        },
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 4,
        },
      },
    },
    assert: {
      assertions: {
        // Performance score >= 75 (NFR14)
        'categories:performance': ['error', { minScore: 0.75 }],
        // Core Web Vitals thresholds (AC2)
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'interactive': ['warn', { maxNumericValue: 3800 }],
        // Accessibility baseline
        'categories:accessibility': ['warn', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
