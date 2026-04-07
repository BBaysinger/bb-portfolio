export const requireExplicitProdWriteConfirmation = (actionName: string, envProfile: string) => {
  if (envProfile !== 'prod') return

  if (process.env.ALLOW_PROD_WRITE !== 'true') {
    throw new Error(
      `Refusing to run ${actionName} against prod: set ALLOW_PROD_WRITE=true to continue.`,
    )
  }

  if (!process.argv.includes('--confirm-prod-write')) {
    throw new Error(`Refusing to run ${actionName} against prod without --confirm-prod-write.`)
  }
}
