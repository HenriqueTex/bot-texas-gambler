/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

router.get('/', async () => {
  return {
    hello: 'world',
  }
})

router.get('/health', async () => {
  return {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }
})

router.get('/metrics', async ({ response }) => {
  const mem = process.memoryUsage()
  const metrics = [
    `process_uptime_seconds ${process.uptime().toFixed(3)}`,
    `nodejs_rss_bytes ${mem.rss}`,
    `nodejs_heap_total_bytes ${mem.heapTotal}`,
    `nodejs_heap_used_bytes ${mem.heapUsed}`,
    `nodejs_external_bytes ${mem.external}`,
  ].join('\n')

  response.type('text/plain')
  return metrics + '\n'
})

router.resource('chats', () => import('#controllers/chat_controller')).apiOnly()
