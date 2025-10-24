import { Test } from '@nestjs/testing'
import { describe, it, expect } from 'vitest'
import { AppModule } from './app.module'
import { CodeInsightsService } from './code-insights/code-insights.service'

describe('AppModule', () => {
  it('debería crear la aplicación correctamente', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    expect(moduleRef).toBeDefined()
  })

  it('debería proveer CodeInsightsService', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    const service = moduleRef.get(CodeInsightsService)
    expect(service).toBeDefined()
  })

  it('debería tener todas las dependencias resueltas', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    await moduleRef.init()
    
    const service = moduleRef.get(CodeInsightsService)
    expect(service).toBeDefined()
  })
})

