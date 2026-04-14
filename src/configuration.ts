export default () => ({
  awsStage: process.env.AWS_STAGE ?? 'prod',
  awsEndpoint: process.env.AWS_ENDPOINT,
  awsRegion: process.env.AWS_REGION,
  aesKeyPath: process.env.TITVO_AES_KEY_PATH,
  parameterTableName: process.env.TITVO_PARAMETER_TABLE_NAME,
});
