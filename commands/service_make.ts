import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { access, mkdir, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, normalize, relative, resolve } from 'node:path'

export default class ServiceMake extends BaseCommand {
  static commandName = 'service:make'
  static description = 'Cria um service dentro de app/services'

  static options: CommandOptions = {}

  static args = [
    {
      name: 'path',
      argumentName: 'path',
      type: 'string' as const,
      required: true,
      description: 'Caminho do service (ex: caminho/nome-service)',
    },
  ]

  async run() {
    const rawPath = (this.parsed.args[0] ?? '').toString().trim()
    if (!rawPath) {
      this.logger.error('Informe o caminho do service, ex: caminho/nome-service')
      this.exitCode = 1
      return
    }

    const normalizedInput = this.normalizeInput(rawPath)
    const withServicesPrefix = this.addServicesPrefix(normalizedInput)
    const withSuffix = this.ensureServiceSuffix(withServicesPrefix)

    if (!this.isServicesPath(withSuffix)) {
      this.logger.error('O caminho precisa ficar dentro de app/services')
      this.exitCode = 1
      return
    }

    const filePath = this.resolveTargetPath(withSuffix)
    if (!filePath) {
      this.exitCode = 1
      return
    }

    const className = this.buildClassName(withSuffix)
    await mkdir(dirname(filePath), { recursive: true })

    if (await this.fileExists(filePath)) {
      this.logger.warning(`Ja existe um service em ${relative(process.cwd(), filePath)}`)
      return
    }

    await writeFile(filePath, this.buildFileContents(className))
    this.logger.success(`Service criado em ${relative(process.cwd(), filePath)}`)
  }

  private normalizeInput(input: string): string {
    const trimmed = input
      .trim()
      .replace(/^[/\\]+/, '')
      .replace(/^app[/\\]/, '')
    const noExt = trimmed.replace(/\.ts$/i, '')
    return normalize(noExt)
  }

  private addServicesPrefix(relativePath: string): string {
    const withoutServices = relativePath.replace(/^services[\\/]/, '')
    return normalize(`services/${withoutServices}`)
  }

  private ensureServiceSuffix(relativePath: string): string {
    const parts = relativePath.split(/[\\/]/)
    const last = parts.pop() || ''
    const base = last.replace(/\.ts$/i, '')
    const needsSuffix = !base.toLowerCase().endsWith('service')
    const withSuffix = needsSuffix ? `${base}_service` : base
    parts.push(withSuffix)
    return normalize(parts.join('/'))
  }

  private isServicesPath(relativePath: string): boolean {
    const firstSegment = relativePath.split(/[\\/]/)[0]
    return firstSegment === 'services'
  }

  private resolveTargetPath(relativePath: string): string | null {
    const baseDir = resolve(process.cwd(), 'app')
    const target = resolve(baseDir, `${relativePath}.ts`)
    const relativeToBase = relative(baseDir, target)
    if (relativeToBase.startsWith('..') || isAbsolute(relativeToBase)) {
      this.logger.error('O caminho precisa estar dentro da pasta app/')
      return null
    }

    return target
  }

  private buildClassName(relativePath: string): string {
    const segments = relativePath.split(/[\\/]/)
    const baseName = segments[segments.length - 1] || 'Service'
    const cleaned = baseName.replace(/\.ts$/i, '')

    return cleaned
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
  }

  private buildFileContents(className: string): string {
    return `export default class ${className} {
  handle() {
    return 'service created'
  }
}
`
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath)
      return true
    } catch {
      return false
    }
  }
}
