import { Injectable, Logger } from "@nestjs/common";
import {
  CodeInsightsInputDto,
  CodeInsightsOutputDto,
  ReportStatus,
} from "@lambda/code-insights/code-insights.dto";
import { ParameterService } from "@lambda/parameter/parameter.service";
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
  ) {}
  async process(input: CodeInsightsInputDto): Promise<CodeInsightsOutputDto> {
    try {
      const apiToken = await this.getAPIToken();
      const reportId = randomUUID();
      const baseUrl = `${BITBUCKET_API_URL}/repositories/${input.workspaceId}`;
      const createReportUrl = `${baseUrl}/${input.repoSlug}/commit/${input.commitHash}/reports/${reportId}`;

      this.logger.debug(`Create code insights report URL: ${createReportUrl}`);

      // Mapear ReportStatus a los valores que espera Bitbucket
      const bitbucketResult =
        input.status === ReportStatus.COMPLETED ? "PASSED" : "FAILED";

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
            value: input.status === ReportStatus.COMPLETED,
          },
          {
            title: "Number of issues",
            type: "NUMBER",
            value: input.annotations.length,
          },
          {
            title: "Report",
            type: "LINK",
            value: { text: "See full report", href: input.reportURL },
          },
        ],
      });
      this.logger.debug(`Create report body: ${createReportBody}`);
      const createReportResponse = await fetch(createReportUrl, {
        method: "PUT",
        body: createReportBody,
        headers: {
          Authorization: `Basic ${apiToken}`,
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
      const createAnnotationtUrl = `${baseUrl}/${input.repoSlug}/commit/${input.commitHash}/reports/${reportId}/annotations`;
      const createAnnotationBody = JSON.stringify(
        input.annotations.map((annotation) => {
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
          Authorization: `Basic ${apiToken}`,
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
      return {
        codeInsightsURL: createReportUrl,
      };
    } catch (error) {
      this.logger.error(
        `Error processing code insights: ${error}`,
      );
      throw new Error(
        `Error processing code insights: ${error}`,
      );
    }
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
