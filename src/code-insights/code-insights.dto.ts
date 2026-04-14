export enum ReportStatus {
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  WARNING = 'WARNING',
}

export class Annotation {
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
}

export class CodeInsightsOutputDto {
  codeInsightsURL: string
}