import fs from 'fs'
import path from 'path'

import { load as loadYaml } from 'js-yaml'

const resolveFromBase = (baseDir: string, targetPath: string) =>
  path.isAbsolute(targetPath) ? targetPath : path.resolve(baseDir, targetPath)

export const resolvePortfolioContentDir = (scriptDir: string) => {
  const repoRoot = path.resolve(scriptDir, '../..')
  const configuredDir = process.env.PORTFOLIO_CONTENT_DIR?.trim()
  const contentDir = configuredDir
    ? resolveFromBase(repoRoot, configuredDir)
    : path.resolve(repoRoot, '../cms-seedings')

  if (!fs.existsSync(contentDir)) {
    throw new Error(
      `Portfolio content directory not found: ${contentDir}. Set PORTFOLIO_CONTENT_DIR if your private content repo lives elsewhere.`,
    )
  }

  return contentDir
}

export const requireDirectory = (directoryPath: string, description: string) => {
  if (!fs.existsSync(directoryPath) || !fs.statSync(directoryPath).isDirectory()) {
    throw new Error(`Missing ${description}: ${directoryPath}`)
  }
}

export const readYamlFile = <T>(filePath: string): T => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing YAML file: ${filePath}`)
  }

  const raw = fs.readFileSync(filePath, 'utf8')
  const parsed = loadYaml(raw)
  if (parsed === undefined) {
    throw new Error(`YAML file is empty: ${filePath}`)
  }

  return parsed as T
}

export const listFilesByExtension = (directoryPath: string, extension: string) => {
  requireDirectory(directoryPath, `directory for *${extension} files`)

  return fs
    .readdirSync(directoryPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => path.resolve(directoryPath, entry.name))
    .sort((left, right) => left.localeCompare(right))
}
