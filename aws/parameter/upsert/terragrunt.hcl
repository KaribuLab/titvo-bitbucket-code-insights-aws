terraform {
  source = "git::https://github.com/KaribuLab/terraform-aws-parameter-upsert.git?ref=v0.5.6"
}

locals {
  serverless = read_terragrunt_config(find_in_parent_folders("serverless.hcl"))
  base_path  = "${local.serverless.locals.parameter_path}/${local.serverless.locals.stage}/infra"
}

dependency "lambda" {
  config_path = "${get_parent_terragrunt_dir()}/aws/lambda"
  mock_outputs = {
    lambda_arn    = "arn:aws:lambda:us-east-2:123456789012:function:bitbucket-code-insights-local"
    function_name = "bitbucket-code-insights-local"
  }
  mock_outputs_allowed_terraform_commands = ["init", "validate", "plan"]
}

include {
  path = find_in_parent_folders()
}

inputs = {
  base_path      = local.base_path
  binary_version = "v0.5.6"
  parameters = [
    {
      path        = "lambda/bitbucket-code-insights-arn"
      value       = dependency.lambda.outputs.lambda_arn
      type        = "String"
      tier        = "Standard"
      description = "Lambda ARN for bitbucket-code-insights"
    },
    {
      path        = "lambda/bitbucket-code-insights-name"
      value       = dependency.lambda.outputs.function_name
      type        = "String"
      tier        = "Standard"
      description = "Lambda name for bitbucket-code-insights"
    },
  ]
}
