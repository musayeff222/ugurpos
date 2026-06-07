module.exports = {
  apps: [
    {
      name: "ugurpos",
      script: "app.js",
      cwd: __dirname + "/../..",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
