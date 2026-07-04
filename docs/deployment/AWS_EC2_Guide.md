# AWS EC2 Deployment Guide

## Architecture
Deploying the Distributed Job Scheduler on AWS EC2 typically involves a single t3.medium (or larger) instance running Docker and Docker Compose. For higher availability, you can extract the database to Amazon RDS.

## Prerequisites
1. An AWS Account.
2. A launched EC2 Instance (Ubuntu 22.04 recommended) with a public IP or Elastic IP.
3. Security Group configured to allow:
   - Inbound SSH (Port 22)
   - Inbound HTTP (Port 80)
   - Inbound HTTPS (Port 443)

## Steps

### 1. Provision the Instance
SSH into your instance:
```bash
ssh -i /path/to/key.pem ubuntu@<your-ec2-ip>
```

### 2. Install Dependencies
```bash
sudo apt update
sudo apt install -y docker.io docker-compose git
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
```
*Log out and log back in for the group change to take effect.*

### 3. Clone Repository and Configure
```bash
git clone https://github.com/your-org/distributed-job-scheduler.git
cd distributed-job-scheduler
```
Create your environment variables file:
```bash
cp .env.example .env
nano .env # Fill in the production values
```

### 4. Deploy
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### 5. Verify
Run the validation script and check health endpoints:
```bash
bash deploy/scripts/validate_env.sh
curl http://localhost/api/health/live
```
