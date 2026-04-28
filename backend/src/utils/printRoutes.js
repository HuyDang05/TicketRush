function getBasePath(regexp) {
  if (!regexp) return '';

  return regexp
    .toString()
    .replace('/^\\', '/')
    .replace('\\/?(?=\\/|$)/i', '')
    .replace(/\\\//g, '/')
    .replace(/\(\?:\(\[\^\\\/]\+\?\)\)/g, ':param')
    .replace(/\$$/, '')
    .replace(/\^/, '')
    .replace(/\?/g, '');
}

function printRoutes(app, port) {
  console.log('\n========== TicketRush API ==========');
  console.log(`[Health]  http://localhost:${port}/health`);
  console.log(`[Swagger] http://localhost:${port}/api/docs`);
  console.log('====================================');

  console.log('\n========== Available Routes ==========');

  const routes = [];

  app._router.stack.forEach((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods)
        .map((m) => m.toUpperCase())
        .join(', ');

      routes.push({
        method: methods,
        path: layer.route.path,
      });
    }

    if (layer.name === 'router' && layer.handle.stack) {
      const basePath = getBasePath(layer.regexp);

      layer.handle.stack.forEach((handler) => {
        if (handler.route) {
          const methods = Object.keys(handler.route.methods)
            .map((m) => m.toUpperCase())
            .join(', ');

          routes.push({
            method: methods,
            path: `${basePath}${handler.route.path}`,
          });
        }
      });
    }
  });

  routes
    .sort((a, b) => a.path.localeCompare(b.path))
    .forEach((route) => {
      console.log(
        `[${route.method.padEnd(6)}] http://localhost:${port}${route.path}`
      );
    });

  console.log('======================================\n');
}

module.exports = printRoutes;