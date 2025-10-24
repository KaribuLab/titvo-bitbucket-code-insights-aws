import { Module } from '@nestjs/common'
import { CodeInsightsService } from '@lambda/code-insights/code-insights.service'
import { AwsModule } from '@lambda/aws/aws.module'
import { ParameterModule } from '@lambda/parameter/parameter.module'

@Module({
  imports: [
    AwsModule.forRoot(),
    ParameterModule.forRoot(),
  ],
  providers: [
    CodeInsightsService,
  ],
  exports: [
    CodeInsightsService,
  ],
})
export class CodeInsightsModule { }
