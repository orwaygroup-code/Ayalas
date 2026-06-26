// Configuración de PM2 para producción (VPS de Orway, multi-cliente).
// Arranque: `pm2 start ecosystem.config.js` desde /var/www/ayalas
module.exports = {
  apps: [
    {
      name: "ayalas",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001",
      cwd: "/var/www/ayalas",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
      },
    },
  ],
};
