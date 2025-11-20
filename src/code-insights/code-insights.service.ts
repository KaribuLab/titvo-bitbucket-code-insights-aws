import { Injectable, Logger } from '@nestjs/common'
import { CodeInsightsInputDto, CodeInsightsOutputDto, ReportStatus } from '@lambda/code-insights/code-insights.dto'
import { ParameterService } from '@lambda/parameter/parameter.service'
import { EventBridgeService } from '@lambda/aws/eventbridge.service'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'crypto'

const ACCESS_TOKEN_URL = "https://bitbucket.org/site/oauth2/access_token"
const BITBUCKET_API_URL = "https://api.bitbucket.org/2.0"

@Injectable()
export class CodeInsightsService {
  private readonly logger = new Logger(CodeInsightsService.name)
  constructor(
    private readonly parameterService: ParameterService,
    private readonly eventBridgeService: EventBridgeService,
    private readonly configService: ConfigService,
  ) { }
  async process(input: CodeInsightsInputDto): Promise<CodeInsightsOutputDto> {
    const eventBusName = this.configService.get<string>('titvoEventBusName') as string;
    const eventData = {
      job_id: input.jobId,
      success: false,
      message: 'Not executed',
      data: {
        report_url: ''
      }
    }
    try {
      const bitbucketClientCredentialsValue: string | undefined = await this.parameterService.getDecryptedParameterValue('bitbucket_client_credentials')
      if (!bitbucketClientCredentialsValue) {
        throw new Error('Bitbucket client credentials not found')
      }
      const bitbucketClientCredentials = JSON.parse(bitbucketClientCredentialsValue) as { key: string, secret: string }
      const accessTokenResponse = await fetch(`${ACCESS_TOKEN_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: bitbucketClientCredentials.key,
          client_secret: bitbucketClientCredentials.secret,
          grant_type: 'client_credentials',
        }).toString(),
      })
      this.logger.debug(`Access token response: ${accessTokenResponse.status} ${accessTokenResponse.statusText}`)
      if (accessTokenResponse.status !== 200) {
        this.logger.error(`Access token response body: ${await accessTokenResponse.text()}`)
        throw new Error(`Error getting access token ${accessTokenResponse.status} ${accessTokenResponse.statusText}`)
      }
      const accessToken = ((await accessTokenResponse.json()) as { access_token: string }).access_token as string
      const reportId = randomUUID()
      const baseUrl = `${BITBUCKET_API_URL}/repositories/${input.data.workspaceId}`
      const createReportUrl = `${baseUrl}/${input.data.repoSlug}/commit/${input.data.commitHash}/reports/${reportId}`

      // Mapear ReportStatus a los valores que espera Bitbucket
      const bitbucketResult = input.data.status === ReportStatus.COMPLETED ? 'PASSED' : 'FAILED'

      const createReportBody = JSON.stringify({
        title: "Titvo Security Scan",
        details: "Security scan report",
        report_type: "SECURITY",
        reporter: "titvo-security-scan",
        result: bitbucketResult,
        data: [
          {
            title: "Safe to merge?",
            type: "BOOLEAN",
            value: input.data.status === ReportStatus.COMPLETED,
          },
          {
            title: "Number of issues",
            type: "NUMBER",
            value: input.data.annotations.length,
          },
          {
            title: "Report",
            type: "LINK",
            value: { text: "See full report", href: input.data.reportURL },
          }
        ]
      })
      this.logger.debug(`Create report body: ${createReportBody}`)
      const createReportResponse = await fetch(createReportUrl, {
        method: 'PUT',
        body: createReportBody,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.debug(`Create report response: ${createReportResponse.status} ${createReportResponse.statusText}`)
      if (createReportResponse.status !== 200) {
        this.logger.error(`Create report response body: ${await createReportResponse.text()}`)
        throw new Error(`Error creating report ${createReportResponse.status} ${createReportResponse.statusText}`)
      }
      const createAnnotationtUrl = `${baseUrl}/${input.data.repoSlug}/commit/${input.data.commitHash}/reports/${reportId}/annotations`
      const createAnnotationBody = JSON.stringify(
        input.data.annotations.map(annotation => {
          return {
            external_id: `${reportId}-annotation-${randomUUID()}`,
            annotation_type: "VULNERABILITY", // Requerido: VULNERABILITY, CODE_SMELL, BUG
            summary: annotation.summary, // Requerido
            details: annotation.description,
            severity: annotation.severity, // HIGH, MEDIUM, LOW, CRITICAL
            path: annotation.path,
            line: annotation.line,
          }
        })
      )
      this.logger.debug(`Create annotation body: ${createAnnotationBody}`)
      const createAnnotationResponse = await fetch(createAnnotationtUrl, {
        method: 'POST',
        body: createAnnotationBody,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })
      this.logger.debug(`Creating annotation: ${createAnnotationResponse.status} ${createAnnotationResponse.statusText}`)
      if (createAnnotationResponse.status !== 200) {
        this.logger.error(`Create annotation response body: ${await createAnnotationResponse.text()}`)
        throw new Error(`Error creating annotation ${createAnnotationResponse.status} ${createAnnotationResponse.statusText}`)
      }
      eventData.success = true;
      eventData.message = 'Code insights generated successfully';
      eventData.data.report_url = createReportUrl;
    } catch (error) {
      this.logger.error(`Error processing code insights for job ${input.jobId}: ${error}`)
      eventData.success = false;
      eventData.message = (error as Error).message ?? error as string;
    }

    finally {
      this.eventBridgeService.putEvents([{
        Source: 'mcp.tool.bitbucket.code-insights',
        DetailType: 'output',
        Detail: JSON.stringify(eventData),
        EventBusName: eventBusName
      }])
    }
    return {
      jobId: input.jobId,
      success: eventData.success,
      message: eventData.message,
      data: {
        reportURL: eventData.data.report_url,
      },
    }
  }
}
