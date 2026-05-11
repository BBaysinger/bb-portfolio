import process from 'node:process'
import { createInterface } from 'node:readline/promises'

export const requireExplicitProdWriteConfirmation = async (
  actionName: string,
  envProfile: string,
  confirmationPhrase: string,
) => {
  if (envProfile !== 'prod') return

  if (process.env.ALLOW_PROD_WRITE !== 'true') {
    throw new Error(
      `Refusing to run ${actionName} against prod: set ALLOW_PROD_WRITE=true to continue.`,
    )
  }

  if (!process.argv.includes('--confirm-prod-write')) {
    throw new Error(`Refusing to run ${actionName} against prod without --confirm-prod-write.`)
  }

  if (process.env.PROD_WRITE_CONFIRMATION === confirmationPhrase) {
    return
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      `Refusing to run ${actionName} against prod without interactive confirmation. Type '${confirmationPhrase}' in an interactive terminal, or set PROD_WRITE_CONFIRMATION to that exact phrase via a guarded wrapper.`,
    )
  }

  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  try {
    console.error(`Type '${confirmationPhrase}' to confirm production write.`)
    const confirmation = (await readline.question('Input: ')).trim()
    if (confirmation !== confirmationPhrase) {
      throw new Error(`Confirmation failed for ${actionName}. Aborting.`)
    }
  } finally {
    readline.close()
  }
}
