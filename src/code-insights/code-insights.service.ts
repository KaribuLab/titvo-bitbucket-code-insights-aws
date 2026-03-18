import { Injectable, Logger } from "@nestjs/common";
import {
  CodeInsightsInputDto,
  CodeInsightsOutputDto,
  ReportStatus,
} from "@lambda/code-insights/code-insights.dto";
import { ParameterService } from "@lambda/parameter/parameter.service";
import { EventBridgeService } from "@lambda/aws/eventbridge.service";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";

const BITBUCKET_API_URL = "https://api.bitbucket.org/2.0";
const BITBUCKET_API_TOKEN_PARAM_NAME = "bitbucket_api_token";

@Injectable()
export class CodeInsightsService {
  private readonly logger = new Logger(CodeInsightsService.name);
  private apiToken: string | null = null;
  constructor(
    private readonly parameterService: ParameterService,
    private readonly eventBridgeService: EventBridgeService,
    private readonly configService: ConfigService,
  ) {}
  async process(input: CodeInsightsInputDto): Promise<CodeInsightsOutputDto> {
    const eventBusName = this.configService.get<string>(
      "titvoEventBusName",
    ) as string;
    const eventData = {
      job_id: input.jobId,
      success: false,
      message: "Not executed",
      data: {
        code_insights_url: "",
      },
    };
    try {
      const apiToken = await this.getAPIToken();
      const reportId = randomUUID();
      const baseUrl = `${BITBUCKET_API_URL}/repositories/${input.data.workspaceId}`;
      const createReportUrl = `${baseUrl}/${input.data.repoSlug}/commit/${input.data.commitHash}/reports/${reportId}`;

      this.logger.debug(`Create code insights report URL: ${createReportUrl}`);

      // Mapear ReportStatus a los valores que espera Bitbucket
      const bitbucketResult =
        input.data.status === ReportStatus.COMPLETED ? "PASSED" : "FAILED";

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
          },
        ],
      });
      this.logger.debug(`Create report body: ${createReportBody}`);
      const createReportResponse = await fetch(createReportUrl, {
        method: "PUT",
        body: createReportBody,
        headers: {
          Authorization: apiToken,
          "Content-Type": "application/json",
        },
      });
      this.logger.debug(
        `Create report response: ${createReportResponse.status} ${createReportResponse.statusText}`,
      );
      if (createReportResponse.status !== 200) {
        this.logger.error(
          `Create report response body: ${await createReportResponse.text()}`,
        );
        throw new Error(
          `Error creating report ${createReportResponse.status} ${createReportResponse.statusText}`,
        );
      }
      const createAnnotationtUrl = `${baseUrl}/${input.data.repoSlug}/commit/${input.data.commitHash}/reports/${reportId}/annotations`;
      const createAnnotationBody = JSON.stringify(
        input.data.annotations.map((annotation) => {
          return {
            external_id: `${reportId}-annotation-${randomUUID()}`,
            annotation_type: "VULNERABILITY", // Requerido: VULNERABILITY, CODE_SMELL, BUG
            summary: annotation.summary, // Requerido
            details: annotation.description,
            severity: annotation.severity, // HIGH, MEDIUM, LOW, CRITICAL
            path: annotation.path,
            line: annotation.line,
          };
        }),
      );
      this.logger.debug(`Create annotation body: ${createAnnotationBody}`);
      const createAnnotationResponse = await fetch(createAnnotationtUrl, {
        method: "POST",
        body: createAnnotationBody,
        headers: {
          Authorization: apiToken,
          "Content-Type": "application/json",
        },
      });
      this.logger.debug(
        `Creating annotation: ${createAnnotationResponse.status} ${createAnnotationResponse.statusText}`,
      );
      if (createAnnotationResponse.status !== 200) {
        this.logger.error(
          `Create annotation response body: ${await createAnnotationResponse.text()}`,
        );
        throw new Error(
          `Error creating annotation ${createAnnotationResponse.status} ${createAnnotationResponse.statusText}`,
        );
      }
      eventData.success = true;
      eventData.message = "Code insights generated successfully";
      eventData.data.code_insights_url = createReportUrl;
    } catch (error) {
      this.logger.error(
        `Error processing code insights for job ${input.jobId}: ${error}`,
      );
      eventData.success = false;
      eventData.message = (error as Error).message ?? (error as string);
    } finally {
      await this.eventBridgeService.putEvents([
        {
          Source: "mcp.tool.bitbucket.code-insights",
          DetailType: "output",
          Detail: JSON.stringify(eventData),
          EventBusName: eventBusName,
        },
      ]);
    }
    return {
      jobId: input.jobId,
      success: eventData.success,
      message: eventData.message,
      data: {
        codeInsightsURL: eventData.data.code_insights_url,
      },
    };
  }
  /**
   * Obtiene un token de acceso OAuth 2.0 (Client Credentials Grant).
   * Usa un valor en caché si no ha expirado.
   */
  private async getAPIToken(): Promise<string> {
    // Si el token existe
    if (this.apiToken) {
      return this.apiToken;
    }

    // Obtener credenciales de forma segura
    const bitbucketAPIToken: string | undefined =
      await this.parameterService.getDecryptedParameterValue(
        BITBUCKET_API_TOKEN_PARAM_NAME,
      );
    if (!bitbucketAPIToken) {
      throw new Error(
        "Bitbucket client credentials not found in Parameter Store.",
      );
    }
    this.apiToken = bitbucketAPIToken;
    return this.apiToken;
  }
}
