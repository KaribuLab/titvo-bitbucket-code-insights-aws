import { afterEach, describe, expect, it, vi } from 'vitest'
import { CodeInsightsService } from './code-insights.service'
import { ParameterService } from '@lambda/parameter/parameter.service'
import { CodeInsightsInputDto, ReportStatus } from './code-insights.dto'

function createInput(scanMode?: string): CodeInsightsInputDto {
  return {
    reportURL: 'https://reports.example/report.html',
    workspaceId: 'workspace',
    repoSlug: 'repo',
    commitHash: 'abc123',
    status: ReportStatus.WARNING,
    scanMode,
    annotations: [
      {
        title: 'Finding',
        description: 'Description',
        severity: 'MEDIUM',
        path: 'src/app.ts',
        line: 10,
        summary: 'Summary',
        recommendation: 'Fix',
      },
    ],
  }
}

function createService(): CodeInsightsService {
  const parameterService = {
    getDecryptedParameterValue: vi.fn().mockResolvedValue('token'),
  } as unknown as ParameterService
  return new CodeInsightsService(parameterService)
}

function mockFetch() {
  const fetchMock = vi.fn().mockResolvedValue({
    status: 200,
    statusText: 'OK',
    text: vi.fn().mockResolvedValue(''),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CodeInsightsService', () => {
  it('uses a stable full-mode report ID', async () => {
    const fetchMock = mockFetch()
    const service = createService()

    const result = await service.process(createInput('full'))

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toContain(
      '/reports/titvo-security-scan-full'
    )
    expect(fetchMock.mock.calls[1][0]).toContain(
      '/reports/titvo-security-scan-full/annotations'
    )
    expect(result.codeInsightsURL).toContain(
      '/reports/titvo-security-scan-full'
    )
  })

  it('defaults to a stable commit-mode report ID', async () => {
    const fetchMock = mockFetch()
    const service = createService()

    const result = await service.process(createInput())

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/reports/titvo-security-scan-commit'
    )
    expect(result.codeInsightsURL).toContain(
      '/reports/titvo-security-scan-commit'
    )
  })

  it('uses stable annotation IDs for report updates', async () => {
    const fetchMock = mockFetch()
    const service = createService()

    await service.process(createInput('commit'))

    const annotationBody = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(annotationBody[0].external_id).toBe(
      'titvo-security-scan-commit-annotation-1'
    )
  })
})
