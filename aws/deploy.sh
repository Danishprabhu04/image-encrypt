#!/bin/bash

# DNA Encryption AWS Deployment Script
# This script deploys the application to AWS ECS using Fargate

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧬 DNA Chaos Encryption - AWS Deployment Script${NC}"
echo "=================================================="

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="dna-encryption-stack"
CLUSTER_NAME="dna-encryption-cluster"
SERVICE_NAME="dna-encryption-service"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install it first.${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Step 1: Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured. Please run 'aws configure'${NC}"
    exit 1
fi
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✅ AWS Account: $ACCOUNT_ID${NC}"

echo -e "${YELLOW}📋 Step 2: Creating/Updating CloudFormation stack...${NC}"
aws cloudformation deploy \
    --template-file aws/cloudformation-template.yml \
    --stack-name $STACK_NAME \
    --capabilities CAPABILITY_IAM \
    --region $AWS_REGION

echo -e "${GREEN}✅ CloudFormation stack deployed${NC}"

# Get ECR repository URIs from CloudFormation outputs
BACKEND_ECR_URI=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query "Stacks[0].Outputs[?OutputKey=='BackendECRRepositoryURI'].OutputValue" \
    --output text \
    --region $AWS_REGION)

FRONTEND_ECR_URI=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query "Stacks[0].Outputs[?OutputKey=='FrontendECRRepositoryURI'].OutputValue" \
    --output text \
    --region $AWS_REGION)

echo -e "${YELLOW}📋 Step 3: Logging into Amazon ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
echo -e "${GREEN}✅ Logged into ECR${NC}"

echo -e "${YELLOW}📋 Step 4: Building and pushing backend image...${NC}"
cd backend
docker build -t dna-encryption-backend .
docker tag dna-encryption-backend:latest $BACKEND_ECR_URI:latest
docker push $BACKEND_ECR_URI:latest
cd ..
echo -e "${GREEN}✅ Backend image pushed${NC}"

echo -e "${YELLOW}📋 Step 5: Building and pushing frontend image...${NC}"
cd frontend
docker build -t dna-encryption-frontend .
docker tag dna-encryption-frontend:latest $FRONTEND_ECR_URI:latest
docker push $FRONTEND_ECR_URI:latest
cd ..
echo -e "${GREEN}✅ Frontend image pushed${NC}"

echo -e "${YELLOW}📋 Step 6: Updating task definition...${NC}"
# Update task definition with actual values
sed "s/YOUR_ACCOUNT_ID/$ACCOUNT_ID/g" aws/task-definition.json > /tmp/task-definition-updated.json
aws ecs register-task-definition \
    --cli-input-json file:///tmp/task-definition-updated.json \
    --region $AWS_REGION
echo -e "${GREEN}✅ Task definition registered${NC}"

echo -e "${YELLOW}📋 Step 7: Creating/Updating ECS service...${NC}"
# Check if service exists
if aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION | grep -q "ACTIVE"; then
    echo "Service exists, updating..."
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service $SERVICE_NAME \
        --task-definition dna-encryption-task \
        --force-new-deployment \
        --region $AWS_REGION
else
    echo "Creating new service..."
    # Get subnet IDs and security group from CloudFormation
    VPC_ID=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query "Stacks[0].Outputs[?OutputKey=='VPCID'].OutputValue" \
        --output text \
        --region $AWS_REGION)
    
    aws ecs create-service \
        --cluster $CLUSTER_NAME \
        --service-name $SERVICE_NAME \
        --task-definition dna-encryption-task \
        --desired-count 1 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
        --region $AWS_REGION
fi
echo -e "${GREEN}✅ Service deployed${NC}"

# Get ALB URL
ALB_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerURL'].OutputValue" \
    --output text \
    --region $AWS_REGION)

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "=================================================="
echo -e "${YELLOW}Application URL:${NC} http://$ALB_URL"
echo -e "${YELLOW}Region:${NC} $AWS_REGION"
echo ""
echo "Note: It may take a few minutes for the service to become available."
echo "Monitor your deployment:"
echo "  aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION"
