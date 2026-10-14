import http from 'node:http';
import mongoose from 'mongoose';
import { app } from './app.js';
import { config } from './config.js';

const SHUTDOWN_GRACE_MS = 10_000;

/** Starts one HTTP server per configured bind address (or one on all interfaces). */
function listen(host) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.once('error', reject);
    server.listen(config.PORT, host, () => resolve(server));
  });
}

const closeServer = (server) =>
  new Promise((resolve) => {
    server.close(resolve);
    server.closeIdleConnections();
  });

async function start() {
  await mongoose.connect(config.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  console.log(`MongoDB connected (${mongoose.connection.name})`);

  const hosts = config.HOST.length ? config.HOST : [undefined];
  const servers = await Promise.all(hosts.map(listen));
  const bound = config.HOST.length ? ` on ${config.HOST.join(', ')}` : '';
  console.log(`ShopKart API listening on http://localhost:${config.PORT}${bound} [${config.NODE_ENV}]`);

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, shutting down gracefully...`);
    setTimeout(() => {
      console.error('Shutdown timed out, forcing exit.');
      process.exit(1);
    }, SHUTDOWN_GRACE_MS).unref();

    await Promise.all(servers.map(closeServer));
    await mongoose.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
