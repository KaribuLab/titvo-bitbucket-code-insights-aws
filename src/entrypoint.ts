import { NestFactory } from '@nestjs/core'
import {
  Context,
  Handler,
  SQSEvent,
  SQSRecord
} from 'aws-lambda'
import { AppModule } from '@lambda/app.module'
import { INestApplicationContext, Logger as NestLogger } from '@nestjs/common'
import { Logger } from 'nestjs-pino'
import { CodeInsightsService } from '@lambda/code-insights/code-insights.service'
import { Annotation, CodeInsightsInputDto, ReportStatus } from '@lambda/code-insights/code-insights.dto'

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

interface CodeInsightsEvent {
  detail: {
    task_id: string
    data: {
      report_url: string
      workspace_id: string,
      commit_hash: string,
      repo_slug: string,
      status: ReportStatus
      annotations: Annotation[]
    }
  }
}

export const handler: Handler<SQSEvent> = async (
  event: SQSEvent,
  _context: Context
): Promise<void> => {
  if (event && event.Records && Array.isArray(event.Records)) {
    try {
      logger.debug(`Iniciando code-insights LambdaHandler: ${JSON.stringify(event)}`)

      const records: CodeInsightsEvent[] = event.Records.map(
        (record: SQSRecord) => JSON.parse(record.body) as CodeInsightsEvent
      )

      const promises = records.map(async (record) => {
        logger.debug(`Procesando mensaje: ${JSON.stringify(record)}`)
        return service.process({
          taskId: record.detail.task_id,
          data: {
            reportURL: record.detail.data.report_url,
            workspaceId: record.detail.data.workspace_id,
            commitHash: record.detail.data.commit_hash,
            repoSlug: record.detail.data.repo_slug,
            status: record.detail.data.status,
            annotations: record.detail.data.annotations,
          },
        })
      })

      await Promise.all(promises)

      logger.debug('code-insights LambdaHandler finalizado.')
    } catch (e) {
      logger.error('Error al procesar el servicio')
      logger.error(e)
      throw e
    }
  }
}
