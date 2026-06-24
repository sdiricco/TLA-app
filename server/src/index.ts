import 'dotenv/config'
import { createApp } from './app'
import { assertEnv, env } from './config/env'

assertEnv()

const app = createApp()

app.listen(env.port, () => {
  // Keep the boot message explicit so we can spot server startup issues quickly.
  console.log(`API listening on http://localhost:${env.port}`)
})
