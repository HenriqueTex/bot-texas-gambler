import Bet from '#models/bet'
import Market from '#models/market'
import { normalizeText } from '../../utils/text_normalizer.js'
import SheetMapFactoryService from '#services/monitoring/sheet_map_factory_service'

type HandleArgs = {
  message: any
}

export default class MessageEditHandlerService {
  private readonly sheetFactory = new SheetMapFactoryService()

  async handle({ message }: HandleArgs): Promise<'success' | 'not_found' | 'skipped' | 'error'> {
    const messageId = message?.message_id
    const chatId = message?.chat?.id

    if (!messageId || !chatId) {
      console.log('Edição ignorada: faltando message_id ou chat.id')
      return 'skipped'
    }

    const normalizedChatId = chatId.toString()

    const bet = await Bet.query()
      .where('message_id', messageId.toString())
      .where('chat_id', normalizedChatId)
      .first()

    if (!bet) {
      console.log('Edição ignorada: bet não encontrada para message_id/chat_id')
      return 'not_found'
    }

    const extractedText = (message.text ?? message.caption ?? '').toString()
    const { units, odd } = this.extractUnitsAndOdd(extractedText)
    const result = this.extractResult(extractedText)

    bet.units = units ?? bet.units
    bet.odd = odd ?? bet.odd
    bet.result = result ?? bet.result
    await bet.save()

    const sheetService = this.sheetFactory.getSheetService({
      chatId: message.chat?.id ?? null,
    })

    const imgResult = {
      odd: bet.odd,
      units: bet.units,
      result: bet.result,
    } as any

    const status = await sheetService.updateLine(message, imgResult as any, bet)

    console.log(
      `Bet atualizada via edição: id=${bet.id}, units=${bet.units}, odd=${bet.odd}, result=${bet.result}, sheetStatus=${status}`
    )
    return 'success'
  }

  private extractUnitsAndOdd(text: string): { units: number | null; odd: number | null } {
    const unitPattern = /(\d+(?:[.,]\d+)?)\s*u\b/i
    const unitMatch = text.match(unitPattern)
    const units = unitMatch ? this.toNumber(unitMatch[1]) : null

    // Remover a porção que contém unidades para não confundir com odd
    const textWithoutUnits = unitMatch
      ? text.slice(0, unitMatch.index) + text.slice(unitMatch.index! + unitMatch[0].length)
      : text

    // Odd precisa ter um prefixo claro (@, odd, odds, cota, cotação)
    const oddPattern = /(?:@|odds?\s*[:\-]?\s*|cota(?:cao)?\s*[:\-]?\s*)(\d+(?:[.,]\d+)?)/i
    const oddMatch = textWithoutUnits.match(oddPattern)
    const odd = oddMatch ? this.toNumber(oddMatch[1]) : null
    console.log(`Extracted units: ${units}, odd: ${odd} from text.`)
    return { units, odd }
  }

  private extractResult(text: string): Bet['result'] | null {
    const lower = (text || '').toLowerCase()

    const halfGreenPattern = /(half\s*green|meio\s*green|meia\s*green|half\s*win|meio\s*win)/i
    const halfRedPattern = /(half\s*red|meio\s*red|meia\s*red|half\s*loss|meio\s*loss)/i

    if (halfGreenPattern.test(lower)) return 'half green'
    if (halfRedPattern.test(lower)) return 'half red'

    if (/[🟢✅✔️]/u.test(text)) return 'green'
    if (/[🟥🔴⭕️❌]/u.test(text)) return 'red'
    if (/[🔁🔄🔃]/u.test(text)) return 'void'

    return null
  }

  private toNumber(value: string): number | null {
    const numeric = Number(value.replace(',', '.'))
    return Number.isFinite(numeric) ? numeric : null
  }
}
