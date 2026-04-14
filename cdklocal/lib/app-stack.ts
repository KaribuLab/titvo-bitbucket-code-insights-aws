import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

export const basePath = '/tvo/security-scan/localstack/infra';

export interface AppStackProps extends cdk.StackProps {
  parameterTableName: string;
  aesKeyPath: string;
}
export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    // Lambda Function
    const lambdaFunction = new Function(this, 'BitbucketCodeInsightsFunction', {
      functionName: 'mcp-bitbucket-code-insights-local',
      runtime: Runtime.NODEJS_22_X,
      handler: 'src/entrypoint.handler',
      code: Code.fromAsset(path.join(__dirname, '../../dist/lambda.zip')),
      timeout: cdk.Duration.seconds(300),
      memorySize: 512,
      description: 'Lambda function for MCP Bitbucket Code Insights',
      environment: {
        AWS_STAGE: 'localstack',
        LOG_LEVEL: 'debug',
        TITVO_PARAMETER_TABLE_NAME: props.parameterTableName,
        TITVO_AES_KEY_PATH: props.aesKeyPath,
        NODE_OPTIONS: '--enable-source-maps',
      },
    });

    // Parámetros SSM para la Lambda
    new StringParameter(this, 'SSMParameterLambdaArn', {
      parameterName: `${basePath}/lambda/bitbucket-code-insights/function_arn`,
      stringValue: lambdaFunction.functionArn,
      description: 'ARN de la función Lambda de MCP Bitbucket Code Insights'
    });

    new StringParameter(this, 'SSMParameterLambdaName', {
      parameterName: `${basePath}/lambda/bitbucket-code-insights/function_name`,
      stringValue: lambdaFunction.functionName,
      description: 'Nombre de la función Lambda de MCP Bitbucket Code Insights'
    });

    new cdk.CfnOutput(this, 'CloudWatchLogGroupName', {
      value: lambdaFunction.logGroup.logGroupName,
      description: 'Nombre del grupo de logs de CloudWatch'
    });
  }
}
