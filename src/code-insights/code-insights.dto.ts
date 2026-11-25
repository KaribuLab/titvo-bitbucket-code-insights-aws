export enum ReportStatus {
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  WARNING = 'WARNING',
}

export class Annotation {
  acceptance?: { reason: string; accepted_by: string; expires_on: string }
  title: string
  description: string
  severity: string
  path: string
  line: number
  summary: string
  recommendation: string
}

export class CodeInsightsInputDto {
  reportURL: string
  workspaceId: string
  commitHash: string
  repoSlug: string
  status: ReportStatus
  annotations: Annotation[]
  scanMode?: string
}

export class CodeInsightsOutputDto {
  codeInsightsURL: string
}
