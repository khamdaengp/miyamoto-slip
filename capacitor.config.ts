import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.miyamoto.salaryviewer',
  appName: 'Miyamoto Salary Viewer',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
