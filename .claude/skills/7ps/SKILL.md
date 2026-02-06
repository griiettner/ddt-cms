---
name: testing-with-7ps
description: Configures and runs component tests and live dependency tests using Capital One's 7PS Test Engine with ephemeral environments. Use when setting up test infrastructure, configuring LocalStack AWS services, writing component_tests or live_dependency_tests stages in OPL, or working with ephemeral testing environments.
---

# 7PS Test Engine

7PS is Capital One's testing platform for component testing and live dependency testing via One Pipeline.

## Testing Types

**Component Testing**: Tests application in isolation with mocked dependencies (Mimeo). Integrate into `component_tests` stage of OPL.

**Live Dependency Testing**: Tests end-to-end with real dependent systems. Integrate into `live_dependency_tests` stage of OPL.

## Ephemeral Environment

Short-lived, isolated deployment using Docker Compose and LocalStack for AWS emulation.

### Supported Pipeline Flavors

- `docker`
- `container/fargate-api`
- `container/fargate-consumer`
- `container/kubernetes`
- `serverless-function/api`
- `serverless-function/pull-event`
- `serverless-function/push-event`
- `serverless-function/scheduled-event`
- `serverless-function/orchestration`
- `serverless-function/standalone`
- `serverless-function/composite`
- `composite-application(CAP)` (pilot)

### Not Supported

- `library-package` (piloting)
- `container/aws-batch`
- `data-processing/application`

## LocalStack AWS Services

**Fully Supported:**
- Lambda (Python, NodeJs, Go, Java)
- S3
- DynamoDB & DynamoDB Streams
- SQS, SNS
- RDS (postgres, aurora-postgres, mysql/mariadb)
- ALB, CloudWatch, Step Function, Cloud Formation
- Kinesis, Redis (Elastic Cache), Neptune

**Not Supported:** AWS Batch, ECS, EKS

## Configuration

1. Identify services your application relies on
2. Provide CloudFormation template for AWS services (S3, SNS, SQS, DynamoDB)
3. Configure service virtualization (Mimeo, wiremock, etc.) in Docker Compose
4. Provide details in `7ps: test_config.yml`

## CLI Usage

```bash
# See 7PS CLI docs for ephemeral testing
# https://github.cloud.capitalone.com/7ps/7PS-CLI#ephemeral-testing
```

## Contact

Slack: `#7ps-ephemeral-environments`
