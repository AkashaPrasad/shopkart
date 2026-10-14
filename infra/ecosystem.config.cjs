module.exports = {
  apps: [
    {
      name: 'shopkart-api',
      script: 'src/server.js',
      cwd: '/opt/shopkart',
      instances: 1,
      autorestart: true,
      max_memory_restart: '600M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
