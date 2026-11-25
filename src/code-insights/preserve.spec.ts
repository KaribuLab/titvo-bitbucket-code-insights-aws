import { it, expect, vi, afterEach } from 'vitest'
import { CodeInsightsService } from './code-insights.service'
afterEach(() => vi.unstubAllGlobals())
it.each([false, true])('preserves all annotations and counts (acceptance=%s)', async accepted => {
 const fetchMock = vi.fn().mockResolvedValue({ status: 200 })
 vi.stubGlobal('fetch', fetchMock)
 const finding = { description: 'desc', severity: 'HIGH', path: 'a', line: 2, summary: 'sum' }
 const annotations = [finding, ...(accepted ? [{ ...finding, acceptance: { reason: 'legacy', accepted_by: 'owner', expires_on: '2030-01-01' } }] : [])]
 await new CodeInsightsService({ getDecryptedParameterValue: async () => 'token' } as any).process({ status: 'FAILED', annotations } as any)
 const report = JSON.parse(fetchMock.mock.calls[0][1].body)
 expect(report.result).toBe('FAILED')
 expect(report.data[0].value).toBe(false)
 expect(report.data[1].value).toBe(annotations.length)
 if (accepted) {
  expect(report.data).toContainEqual({ title: 'Active findings', type: 'NUMBER', value: 1 })
  expect(report.data).toContainEqual({ title: 'Accepted risks', type: 'NUMBER', value: 1 })
 } else expect(report.data).toHaveLength(3)
 const output = JSON.parse(fetchMock.mock.calls[1][1].body)
 expect(output).toHaveLength(annotations.length)
 expect(output[0]).toMatchObject({ severity: 'HIGH', path: 'a', line: 2, summary: 'sum', details: 'desc' })
})
