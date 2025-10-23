import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config';
import { CodeInsightsInputDto, CodeInsightsOutputDto } from '@lambda/code-insights/code-insights.dto'

@Injectable()
export class CodeInsightsService {
  private readonly logger = new Logger(CodeInsightsService.name)
  constructor (
    private readonly configService: ConfigService,
  ) {}
  async process (input: CodeInsightsInputDto): Promise<CodeInsightsOutputDto> {
    const dummy = this.configService.get<string>('dummy')
    this.logger.log(`dummy: ${dummy}`)
    return {
      name: `${dummy} ${input.name}`
    }
  }
}
