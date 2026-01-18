# AWS Deployment Guide - DNA Chaos Encryption

This guide will help you deploy your DNA encryption application to AWS cloud.

## 🚀 Deployment Options

### Option 1: AWS ECS with Fargate (Recommended)
- Fully managed container orchestration
- No server management
- Auto-scaling capabilities
- Best for production use

### Option 2: AWS Elastic Beanstalk
- Simpler deployment
- Automatic load balancing
- Good for quick deployments

### Option 3: EC2 with Docker Compose
- Full control over infrastructure
- Manual scaling
- Good for development/testing

---

## 📋 Prerequisites

Before deploying, ensure you have:

1. **AWS Account** - [Sign up here](https://aws.amazon.com/)
2. **AWS CLI** installed and configured
   ```bash
   # Install AWS CLI
   pip install awscli
   
   # Configure credentials
   aws configure
   ```
3. **Docker** installed locally
4. **Git** (for CI/CD pipeline)

---

## 🎯 Option 1: Deploy with AWS ECS/Fargate (Recommended)

### Step 1: Initial AWS Setup

```bash
# Set your AWS region
export AWS_REGION=us-east-1

# Get your AWS account ID
aws sts get-caller-identity --query Account --output text
```

### Step 2: Create Infrastructure with CloudFormation

```bash
# Deploy the CloudFormation stack
cd aws
aws cloudformation create-stack \
  --stack-name dna-encryption-stack \
  --template-body file://cloudformation-template.yml \
  --capabilities CAPABILITY_IAM \
  --region $AWS_REGION

# Wait for stack creation (takes ~5 minutes)
aws cloudformation wait stack-create-complete \
  --stack-name dna-encryption-stack \
  --region $AWS_REGION
```

### Step 3: Build and Push Docker Images

```bash
# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com

# Get ECR repository URIs
BACKEND_ECR=$(aws cloudformation describe-stacks \
  --stack-name dna-encryption-stack \
  --query "Stacks[0].Outputs[?OutputKey=='BackendECRRepositoryURI'].OutputValue" \
  --output text)

FRONTEND_ECR=$(aws cloudformation describe-stacks \
  --stack-name dna-encryption-stack \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendECRRepositoryURI'].OutputValue" \
  --output text)

# Build and push backend
cd backend
docker build -t dna-encryption-backend .
docker tag dna-encryption-backend:latest $BACKEND_ECR:latest
docker push $BACKEND_ECR:latest

# Build and push frontend
cd ../frontend
docker build -t dna-encryption-frontend .
docker tag dna-encryption-frontend:latest $FRONTEND_ECR:latest
docker push $FRONTEND_ECR:latest
```

### Step 4: Update Task Definition and Deploy

```bash
# Update task definition with your account ID
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
cd ../aws

# Replace placeholders in task definition
sed "s/YOUR_ACCOUNT_ID/$ACCOUNT_ID/g" task-definition.json > task-definition-updated.json

# Register task definition
aws ecs register-task-definition \
  --cli-input-json file://task-definition-updated.json \
  --region $AWS_REGION

# Get VPC and subnet information
VPC_ID=$(aws cloudformation describe-stack-resource \
  --stack-name dna-encryption-stack \
  --logical-resource-id VPC \
  --query "StackResourceDetail.PhysicalResourceId" \
  --output text)

SUBNET1=$(aws cloudformation describe-stack-resource \
  --stack-name dna-encryption-stack \
  --logical-resource-id PublicSubnet1 \
  --query "StackResourceDetail.PhysicalResourceId" \
  --output text)

SUBNET2=$(aws cloudformation describe-stack-resource \
  --stack-name dna-encryption-stack \
  --logical-resource-id PublicSubnet2 \
  --query "StackResourceDetail.PhysicalResourceId" \
  --output text)

SECURITY_GROUP=$(aws cloudformation describe-stack-resource \
  --stack-name dna-encryption-stack \
  --logical-resource-id ECSSecurityGroup \
  --query "StackResourceDetail.PhysicalResourceId" \
  --output text)

TARGET_GROUP=$(aws cloudformation describe-stack-resource \
  --stack-name dna-encryption-stack \
  --logical-resource-id ALBTargetGroup \
  --query "StackResourceDetail.PhysicalResourceId" \
  --output text)

# Create ECS service
aws ecs create-service \
  --cluster dna-encryption-cluster \
  --service-name dna-encryption-service \
  --task-definition dna-encryption-task \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET1,$SUBNET2],securityGroups=[$SECURITY_GROUP],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$TARGET_GROUP,containerName=frontend,containerPort=80" \
  --region $AWS_REGION
```

### Step 5: Get Your Application URL

```bash
# Get the Load Balancer URL
ALB_URL=$(aws cloudformation describe-stacks \
  --stack-name dna-encryption-stack \
  --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerURL'].OutputValue" \
  --output text)

echo "Your application is available at: http://$ALB_URL"
```

---

## 🔄 Automated Deployment Script

For easier deployment, use the provided script:

```bash
# Make script executable
chmod +x aws/deploy.sh

# Run deployment
./aws/deploy.sh
```

---

## 🔧 Option 2: Deploy with AWS Elastic Beanstalk

### Step 1: Initialize Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize application
cd backend
eb init -p docker dna-encryption-backend --region us-east-1

# Create environment
eb create dna-encryption-env
```

### Step 2: Deploy

```bash
# Deploy application
eb deploy

# Open in browser
eb open
```

---

## 🖥️ Option 3: Deploy to EC2 with Docker Compose

### Step 1: Launch EC2 Instance

1. Go to AWS Console → EC2
2. Launch instance (Ubuntu 22.04 LTS, t3.medium or larger)
3. Configure security group:
   - Port 80 (HTTP)
   - Port 443 (HTTPS)
   - Port 22 (SSH)

### Step 2: Install Docker on EC2

```bash
# SSH into your instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install Docker and Docker Compose
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
```

### Step 3: Deploy Application

```bash
# Clone your repository
git clone https://github.com/your-username/aws_project.git
cd aws_project

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

Your app will be available at `http://your-ec2-ip`

---

## 🔐 Important Security Considerations

### 1. Enable HTTPS

```bash
# Install Certbot for SSL certificate
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com
```

### 2. Configure Environment Variables

Create `.env` file:
```bash
# Backend .env
ALLOWED_ORIGINS=https://yourdomain.com
MAX_UPLOAD_SIZE=10485760
```

### 3. Enable CORS Properly

Update [backend/main.py](backend/main.py) with your domain:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 📊 Monitoring and Logs

### View ECS Logs

```bash
# Backend logs
aws logs tail /ecs/dna-encryption-backend --follow

# Frontend logs
aws logs tail /ecs/dna-encryption-frontend --follow
```

### CloudWatch Metrics

Access metrics at: AWS Console → CloudWatch → Dashboards

---

## 💰 Cost Estimation

### ECS Fargate (Option 1)
- **1 vCPU, 2GB RAM**: ~$30-40/month
- **ALB**: ~$20/month
- **Data transfer**: Variable
- **Total**: ~$50-60/month

### Elastic Beanstalk (Option 2)
- **t3.medium instance**: ~$30/month
- **ALB**: ~$20/month
- **Total**: ~$50/month

### EC2 (Option 3)
- **t3.medium**: ~$30/month
- **Total**: ~$30/month (cheapest but manual management)

---

## 🔄 CI/CD with GitHub Actions

The `.github/workflows/deploy-to-aws.yml` file is already configured.

### Setup Steps:

1. Add secrets to GitHub repository:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

2. Push to main branch:
   ```bash
   git add .
   git commit -m "Deploy to AWS"
   git push origin main
   ```

3. GitHub Actions will automatically:
   - Build Docker images
   - Push to ECR
   - Deploy to ECS

---

## 🛠️ Troubleshooting

### Images not building?
```bash
# Check Docker is running
docker ps

# Check Dockerfile syntax
docker build -t test ./backend
```

### Service not starting?
```bash
# Check ECS service events
aws ecs describe-services \
  --cluster dna-encryption-cluster \
  --services dna-encryption-service

# Check task logs
aws ecs describe-tasks \
  --cluster dna-encryption-cluster \
  --tasks $(aws ecs list-tasks --cluster dna-encryption-cluster --query 'taskArns[0]' --output text)
```

### Can't access application?
- Check security group rules (port 80 open)
- Verify ALB health checks are passing
- Check target group registration

---

## 🎯 Post-Deployment Checklist

- [ ] Application accessible via ALB URL
- [ ] Backend API responding
- [ ] Image encryption/decryption working
- [ ] SSL certificate installed (if using domain)
- [ ] CloudWatch logs enabled
- [ ] Auto-scaling configured (optional)
- [ ] Backup strategy in place
- [ ] Monitoring alerts set up

---

## 📞 Support

For issues:
1. Check CloudWatch logs
2. Review ECS task events
3. Verify security group rules
4. Check MATLAB licensing (if using compiled code)

---

## 🧹 Cleanup (Delete Everything)

```bash
# Delete ECS service
aws ecs delete-service \
  --cluster dna-encryption-cluster \
  --service dna-encryption-service \
  --force

# Delete CloudFormation stack
aws cloudformation delete-stack \
  --stack-name dna-encryption-stack

# Delete ECR images (optional)
aws ecr batch-delete-image \
  --repository-name dna-encryption-backend \
  --image-ids imageTag=latest

aws ecr batch-delete-image \
  --repository-name dna-encryption-frontend \
  --image-ids imageTag=latest
```

---

**Your DNA Chaos Encryption app is now ready for AWS deployment! 🚀**
