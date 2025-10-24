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
  taskId: string
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
  taskId: string
  data: {
    reportURL: string
  }
}