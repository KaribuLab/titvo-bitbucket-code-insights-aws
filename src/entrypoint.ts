import { NestFactory } from '@nestjs/core'
import {
  Context,
  Handler,
} from 'aws-lambda'
import { AppModule } from '@lambda/app.module'
import { INestApplicationContext, Logger as NestLogger } from '@nestjs/common'
import { Logger } from 'nestjs-pino'
import { CodeInsightsService } from '@lambda/code-insights/code-insights.service'
import { CodeInsightsInputDto, CodeInsightsOutputDto } from '@lambda/code-insights/code-insights.dto'

const logger = new NestLogger('code-insightsLambdaHandler')

async function initApp(): Promise<INestApplicationContext> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  await app.init()
  app.flushLogs()

  return app
}

let app: INestApplicationContext | undefined;

if (app === undefined) {
  app = await initApp();
}

const service = app.get(CodeInsightsService)


export const handler: Handler<CodeInsightsInputDto> = async (
  event: CodeInsightsInputDto,
  _context: Context
): Promise<CodeInsightsOutputDto> => {
  try {
    logger.debug(`Procesando mensaje: ${JSON.stringify(event)}`)
    return service.process(event)
  } catch (e) {
    logger.error('Error al procesar el servicio')
    logger.error(e)
    throw e
  }
}
