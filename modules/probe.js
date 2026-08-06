/* ROOMSCAPE probe module (2026-07-16)
   Throwaway. Proves that web/modules/*.js is deployed to /app on restart and
   that the route-table dispatcher loads + serves external modules. Delete once
   the modules+dispatcher refactor is confirmed. Registers GET /api/_probe. */
module.exports.register = function (router) {
  router.add('GET', '/api/_probe', function (req, res, u, real) {
    real.json(200, {
      ok: true,
      from: 'module',
      file: 'modules/probe.js',
      dir: __dirname,
      pid: process.pid,
      routes: router.count()
    });
  });
  try { console.log('[probe] module registered /api/_probe from ' + __dirname); } catch (e) {}
};
