import { Module } from '@nestjs/common'
import { CodeInsightsService } from '@lambda/code-insights/code-insights.service'

@Module({
  providers: [CodeInsightsService]
})
export class CodeInsightsModule {}
