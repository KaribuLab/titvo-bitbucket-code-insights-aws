import { DynamicModule, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AwsModule } from '@lambda/aws/aws.module'
import { DynamoDBService } from '@lambda/aws/dynamodb.service'
import { SecretManagerService } from '@lambda/aws/secretmanager.service'
import { createParameterService, ParameterService } from './parameter.service'

@Module({})
export class ParameterModule {
  static forRoot(): DynamicModule {
    return {
      module: ParameterModule,
      imports: [AwsModule.forRoot()],
      providers: [
        {
          provide: ParameterService,
          useFactory: (
            dynamoService: DynamoDBService,
            secretManagerService: SecretManagerService,
            configService: ConfigService,
          ) => createParameterService({
            tableName: configService.get<string>('parameterTableName') as string,
            aesKeyPath: configService.get<string>('aesKeyPath') as string,
            dynamoService,
            secretManagerService,
          }),
          inject: [DynamoDBService, SecretManagerService, ConfigService],
        },
      ],
      exports: [ParameterService],
    }
  }

  static forRootAsync(options: {
    useFactory: (configService: ConfigService) => {
      tableName: string;
      aesKeyPath: string;
    };
    inject?: any[];
  }): DynamicModule {
    return {
      module: ParameterModule,
      imports: [AwsModule.forRoot()],
      providers: [
        {
          provide: ParameterService,
          useFactory: (
            dynamoService: DynamoDBService,
            secretManagerService: SecretManagerService,
            configService: ConfigService,
          ) => {
            const config = options.useFactory(configService)
            return createParameterService({
              tableName: config.tableName,
              aesKeyPath: config.aesKeyPath,
              dynamoService,
              secretManagerService,
            })
          },
          inject: [DynamoDBService, SecretManagerService, ConfigService, ...(options.inject || [])],
        },
      ],
      exports: [ParameterService],
    }
  }
}

