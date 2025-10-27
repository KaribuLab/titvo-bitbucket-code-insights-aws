export enum ReportStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
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
  jobId: string
  data: {
    reportURL: string
    workspaceId: string
    commitHash: string
    repoSlug: string
    status: ReportStatus
    annotations: Annotation[]
  }
}
export class CodeInsightsOutputDto {
  jobId: string
  data: {
    reportURL: string
  }
}