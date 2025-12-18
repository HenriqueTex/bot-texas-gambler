import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import TelegramForwarderService from '#services/telegram_forwarder'

const requiredVariables = [
  'TELEGRAM_API_ID',
  'TELEGRAM_API_HASH',
  'TELEGRAM_SESSION',
  'SOURCE_CHAT_ID',
  'TARGET_CHAT_ID',
] as const

const missingVariables = requiredVariables.filter((variable) => {
  try {
    const value = env.get(variable as never)
    return value === undefined || value === ''
  } catch {
    return true
  }
})

const isAceCommand = process.argv.some((arg) => arg.includes('ace'))
const shouldRun = !isAceCommand && env.get('NODE_ENV') !== 'test' && missingVariables.length === 0

if (!shouldRun) {
  if (missingVariables.length) {
    logger.info(
      `Encaminhamento do Telegram não iniciado: variáveis ausentes (${missingVariables.join(', ')})`
    )
  }
} else {
  const forwarder = new TelegramForwarderService()
  forwarder.start().catch((error) => {
    logger.error({ err: error }, 'Falha ao iniciar replicação automática do Telegram')
  })
}
