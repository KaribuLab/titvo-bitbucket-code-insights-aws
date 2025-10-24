import { DynamicModule, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createDynamoDBService, DynamoDBService } from './dynamodb.service'
import { createSecretManagerService, SecretManagerService } from './secretmanager.service'
import { createEventBridgeService, EventBridgeService } from './eventbridge.service'

@Module({})
export class AwsModule {
  static forRoot(): DynamicModule {
    return {
      module: AwsModule,
      providers: [
        {
          provide: DynamoDBService,
          useFactory: (configService: ConfigService) => createDynamoDBService({
            awsStage: configService.get<string>('awsStage') ?? 'prod',
            awsEndpoint: configService.get<string>('awsEndpoint') as string,
            awsRegion: configService.get<string>('awsRegion') as string,
          }),
          inject: [ConfigService],
        },
        {
          provide: SecretManagerService,
          useFactory: (configService: ConfigService) => createSecretManagerService({
            awsStage: configService.get<string>('awsStage') ?? 'prod',
            awsEndpoint: configService.get<string>('awsEndpoint') as string,
            awsRegion: configService.get<string>('awsRegion') as string,
          }),
          inject: [ConfigService],
        },
        {
          provide: EventBridgeService,
          useFactory: (configService: ConfigService) => createEventBridgeService({
            awsStage: configService.get<string>('awsStage') ?? 'prod',
            awsEndpoint: configService.get<string>('awsEndpoint') as string,
            awsRegion: configService.get<string>('awsRegion') as string,
          }),
          inject: [ConfigService],
        }
      ],
      exports: [DynamoDBService, SecretManagerService, EventBridgeService],
    }
  }
}

