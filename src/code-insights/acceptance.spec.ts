import { it, expect, vi, afterEach } from 'vitest'
import { CodeInsightsService } from './code-insights.service'
afterEach(() => vi.unstubAllGlobals())
it.each(['COMPLETED', 'WARNING', 'FAILED'])('preserves upstream %s for accepted-only report', async status => {
  const fetchMock = vi.fn().mockResolvedValue({ status: 200 })
  vi.stubGlobal('fetch', fetchMock)
  const service = new CodeInsightsService({ getDecryptedParameterValue: async () => 'token' } as any)
  await service.process({ status, annotations: [{ title: 'MD5', summary: 'Evidence', description: 'Legacy hashing', severity: 'LOW', path: 'src/a', line: 1, acceptance: { reason: 'Legacy required', accepted_by: 'Security', expires_on: '2030-01-01' } }] } as any)
  const report = JSON.parse(fetchMock.mock.calls[0][1].body)
  expect(report.result).toBe(status === 'COMPLETED' ? 'PASSED' : 'FAILED')
  expect(report.data).toContainEqual({ title: 'Active findings', type: 'NUMBER', value: 0 })
  expect(report.data).toContainEqual({ title: 'Accepted risks', type: 'NUMBER', value: 1 })
  const [finding] = JSON.parse(fetchMock.mock.calls[1][1].body)
  expect(finding).toMatchObject({ severity: 'LOW', path: 'src/a', line: 1, summary: 'Evidence' })
  for (const text of ['Legacy hashing', 'Accepted risk', 'Legacy required', 'Security', '2030-01-01']) expect(finding.details).toContain(text)
})
