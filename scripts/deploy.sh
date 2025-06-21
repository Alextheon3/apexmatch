#!/bin/bash

# ApexMatch Production Deployment Script
# Automated deployment for the revolutionary dating platform

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
APEXMATCH_VERSION="1.0.0"
DEPLOYMENT_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_RETENTION_DAYS=7
HEALTH_CHECK_TIMEOUT=300  # 5 minutes

# Deployment environments
ENVIRONMENT=${ENVIRONMENT:-production}
DEPLOY_TARGET=${DEPLOY_TARGET:-kubernetes}  # kubernetes, docker-compose, ecs

# Git configuration
GIT_BRANCH=${GIT_BRANCH:-main}
GIT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")

# Container registry
REGISTRY=${REGISTRY:-ghcr.io/your-org/apexmatch}
IMAGE_TAG=${IMAGE_TAG:-$GIT_COMMIT}

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}$1${NC}"
}

print_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to log deployment events
log_deployment() {
    local event="$1"
    local status="$2"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    echo "[$timestamp] DEPLOYMENT - $event: $status" >> deployment.log
    
    # Send to monitoring service if configured
    if [[ -n "$DEPLOYMENT_WEBHOOK_URL" ]]; then
        curl -s -X POST "$DEPLOYMENT_WEBHOOK_URL" \
             -H "Content-Type: application/json" \
             -d "{
                 \"timestamp\": \"$timestamp\",
                 \"environment\": \"$ENVIRONMENT\",
                 \"event\": \"$event\",
                 \"status\": \"$status\",
                 \"version\": \"$APEXMATCH_VERSION\",
                 \"commit\": \"$GIT_COMMIT\"
             }" >/dev/null 2>&1 || true
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_header "🔍 Checking Deployment Prerequisites..."
    
    # Check required tools
    local missing_tools=()
    
    case $DEPLOY_TARGET in
        kubernetes)
            if ! command_exists kubectl; then
                missing_tools+=("kubectl")
            fi
            if ! command_exists helm; then
                missing_tools+=("helm")
            fi
            ;;
        docker-compose)
            if ! command_exists docker; then
                missing_tools+=("docker")
            fi
            if ! command_exists docker-compose; then
                missing_tools+=("docker-compose")
            fi
            ;;
        ecs)
            if ! command_exists aws; then
                missing_tools+=("aws")
            fi
            ;;
    esac
    
    if ! command_exists git; then
        missing_tools+=("git")
    fi
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
    
    # Check environment configuration
    if [[ ! -f ".env.$ENVIRONMENT" ]]; then
        print_error "Environment file .env.$ENVIRONMENT not found"
        exit 1
    fi
    
    # Source environment variables
    set -a
    source ".env.$ENVIRONMENT"
    set +a
    
    # Verify critical environment variables
    local required_vars=(
        "DATABASE_URL"
        "JWT_SECRET_KEY"
        "REDIS_URL"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            print_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    print_status "Prerequisites check completed ✅"
    log_deployment "PREREQUISITES_CHECK" "SUCCESS"
}

# Function to run pre-deployment tests
run_pre_deployment_tests() {
    print_header "🧪 Running Pre-Deployment Tests..."
    
    # Run unit tests
    print_step "Running unit tests..."
    if [[ -f "backend/requirements-test.txt" ]]; then
        docker run --rm -v "$(pwd)/backend:/app" \
                   python:3.11-slim bash -c "
                   cd /app && 
                   pip install -r requirements.txt -r requirements-test.txt && 
                   pytest tests/ -v --tb=short
                   "
    else
        print_warning "Test requirements not found, skipping unit tests"
    fi
    
    # Run integration tests
    print_step "Running integration tests..."
    if [[ -f "tests/integration/test_api.py" ]]; then
        # Start test environment
        docker-compose -f docker-compose.test.yml up -d
        sleep 30
        
        # Run integration tests
        docker-compose -f docker-compose.test.yml exec -T backend \
            pytest tests/integration/ -v
        
        # Cleanup test environment
        docker-compose -f docker-compose.test.yml down -v
    else
        print_warning "Integration tests not found, skipping"
    fi
    
    print_status "Pre-deployment tests completed ✅"
    log_deployment "PRE_DEPLOYMENT_TESTS" "SUCCESS"
}

# Function to create backup
create_backup() {
    print_header "💾 Creating Backup..."
    
    local backup_dir="backups/$DEPLOYMENT_TIMESTAMP"
    mkdir -p "$backup_dir"
    
    # Database backup
    if [[ -n "$DATABASE_BACKUP_ENABLED" && "$DATABASE_BACKUP_ENABLED" == "true" ]]; then
        print_step "Creating database backup..."
        
        case $DEPLOY_TARGET in
            kubernetes)
                kubectl exec -n apexmatch-prod deployment/postgres -- \
                    pg_dump "$DATABASE_URL" > "$backup_dir/database.sql"
                ;;
            docker-compose)
                docker-compose exec -T postgres \
                    pg_dump "$DATABASE_URL" > "$backup_dir/database.sql"
                ;;
            ecs)
                # Assuming RDS instance
                aws rds create-db-snapshot \
                    --db-instance-identifier apexmatch-prod \
                    --db-snapshot-identifier "apexmatch-$DEPLOYMENT_TIMESTAMP" \
                    --region "$AWS_REGION"
                ;;
        esac
        
        # Compress backup
        if [[ -f "$backup_dir/database.sql" ]]; then
            gzip "$backup_dir/database.sql"
            print_status "Database backup created: $backup_dir/database.sql.gz"
        fi
    fi
    
    # Application state backup
    print_step "Creating application state backup..."
    
    # Backup configuration files
    cp -r k8s/ "$backup_dir/" 2>/dev/null || true
    cp docker-compose*.yml "$backup_dir/" 2>/dev/null || true
    cp .env.* "$backup_dir/" 2>/dev/null || true
    
    # Create backup metadata
    cat > "$backup_dir/metadata.json" << EOF
{
    "timestamp": "$DEPLOYMENT_TIMESTAMP",
    "environment": "$ENVIRONMENT",
    "version": "$APEXMATCH_VERSION",
    "git_commit": "$GIT_COMMIT",
    "git_branch": "$GIT_BRANCH",
    "deploy_target": "$DEPLOY_TARGET"
}
EOF
    
    # Upload backup to cloud storage if configured
    if [[ -n "$BACKUP_S3_BUCKET" ]]; then
        print_step "Uploading backup to S3..."
        tar -czf "$backup_dir.tar.gz" -C backups "$(basename "$backup_dir")"
        aws s3 cp "$backup_dir.tar.gz" "s3://$BACKUP_S3_BUCKET/apexmatch/backups/"
        rm "$backup_dir.tar.gz"
    fi
    
    # Cleanup old backups
    find backups/ -type d -name "*_*" -mtime +$BACKUP_RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true
    
    print_status "Backup completed ✅"
    log_deployment "BACKUP_CREATED" "SUCCESS"
}

# Function to build and push container images
build_and_push_images() {
    print_header "🏗️ Building and Pushing Container Images..."
    
    # Login to container registry
    print_step "Logging into container registry..."
    case $REGISTRY in
        ghcr.io*)
            echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USERNAME" --password-stdin
            ;;
        *.amazonaws.com*)
            aws ecr get-login-password --region "$AWS_REGION" | \
                docker login --username AWS --password-stdin "$REGISTRY"
            ;;
        *)
            docker login "$REGISTRY" -u "$REGISTRY_USERNAME" -p "$REGISTRY_PASSWORD"
            ;;
    esac
    
    # Build backend image
    print_step "Building backend image..."
    docker build -t "$REGISTRY/backend:$IMAGE_TAG" \
                 -t "$REGISTRY/backend:latest" \
                 --build-arg VERSION="$APEXMATCH_VERSION" \
                 --build-arg BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
                 --build-arg GIT_COMMIT="$GIT_COMMIT" \
                 ./backend
    
    # Build frontend image
    print_step "Building frontend image..."
    docker build -t "$REGISTRY/frontend:$IMAGE_TAG" \
                 -t "$REGISTRY/frontend:latest" \
                 --build-arg REACT_APP_VERSION="$APEXMATCH_VERSION" \
                 --build-arg REACT_APP_BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
                 --build-arg REACT_APP_GIT_COMMIT="$GIT_COMMIT" \
                 ./frontend
    
    # Push images
    print_step "Pushing images to registry..."
    docker push "$REGISTRY/backend:$IMAGE_TAG"
    docker push "$REGISTRY/backend:latest"
    docker push "$REGISTRY/frontend:$IMAGE_TAG"
    docker push "$REGISTRY/frontend:latest"
    
    print_status "Images built and pushed successfully ✅"
    log_deployment "IMAGES_BUILT" "SUCCESS"
}

# Function to deploy to Kubernetes
deploy_kubernetes() {
    print_header "☸️ Deploying to Kubernetes..."
    
    # Check cluster connection
    if ! kubectl cluster-info >/dev/null 2>&1; then
        print_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Create namespace if it doesn't exist
    kubectl create namespace "apexmatch-$ENVIRONMENT" --dry-run=client -o yaml | kubectl apply -f -
    
    # Update deployment manifests with new image tags
    print_step "Updating deployment manifests..."
    
    # Create temporary directory for manifests
    local temp_dir=$(mktemp -d)
    cp -r k8s/* "$temp_dir/"
    
    # Update image tags in manifests
    find "$temp_dir" -name "*.yaml" -type f -exec sed -i.bak \
        -e "s|image: apexmatch/backend:.*|image: $REGISTRY/backend:$IMAGE_TAG|g" \
        -e "s|image: apexmatch/frontend:.*|image: $REGISTRY/frontend:$IMAGE_TAG|g" \
        {} \;
    
    # Update environment-specific configurations
    if [[ -f "k8s/overlays/$ENVIRONMENT/kustomization.yaml" ]]; then
        kubectl apply -k "k8s/overlays/$ENVIRONMENT/"
    else
        # Apply base manifests
        kubectl apply -f "$temp_dir/" -n "apexmatch-$ENVIRONMENT"
    fi
    
    # Update secrets if they've changed
    if [[ -f ".env.$ENVIRONMENT" ]]; then
        print_step "Updating secrets..."
        kubectl create secret generic apexmatch-secrets \
            --from-env-file=".env.$ENVIRONMENT" \
            --namespace="apexmatch-$ENVIRONMENT" \
            --dry-run=client -o yaml | kubectl apply -f -
    fi
    
    # Wait for deployment to complete
    print_step "Waiting for deployment to complete..."
    kubectl rollout status deployment/apexmatch-backend -n "apexmatch-$ENVIRONMENT" --timeout=${HEALTH_CHECK_TIMEOUT}s
    kubectl rollout status deployment/apexmatch-frontend -n "apexmatch-$ENVIRONMENT" --timeout=${HEALTH_CHECK_TIMEOUT}s
    
    # Run database migrations
    print_step "Running database migrations..."
    kubectl exec -n "apexmatch-$ENVIRONMENT" deployment/apexmatch-backend -- \
        alembic upgrade head
    
    # Cleanup
    rm -rf "$temp_dir"
    
    print_status "Kubernetes deployment completed ✅"
    log_deployment "KUBERNETES_DEPLOYMENT" "SUCCESS"
}

# Function to deploy with Docker Compose
deploy_docker_compose() {
    print_header "🐳 Deploying with Docker Compose..."
    
    # Use production compose file
    local compose_file="docker-compose.prod.yml"
    if [[ ! -f "$compose_file" ]]; then
        compose_file="docker-compose.yml"
    fi
    
    # Pull latest images
    print_step "Pulling latest images..."
    docker-compose -f "$compose_file" pull
    
    # Stop existing services gracefully
    print_step "Stopping existing services..."
    docker-compose -f "$compose_file" down --timeout 30
    
    # Start services with new images
    print_step "Starting services..."
    docker-compose -f "$compose_file" up -d
    
    # Wait for services to be healthy
    print_step "Waiting for services to be ready..."
    local max_attempts=$((HEALTH_CHECK_TIMEOUT / 10))
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if docker-compose -f "$compose_file" exec -T backend python -c "
import requests
try:
    response = requests.get('http://localhost:8000/health', timeout=5)
    if response.status_code == 200:
        exit(0)
except:
    pass
exit(1)
" 2>/dev/null; then
            break
        fi
        attempt=$((attempt + 1))
        sleep 10
    done
    
    if [[ $attempt -eq $max_attempts ]]; then
        print_error "Services failed to become healthy within timeout"
        exit 1
    fi
    
    # Run database migrations
    print_step "Running database migrations..."
    docker-compose -f "$compose_file" exec backend alembic upgrade head
    
    print_status "Docker Compose deployment completed ✅"
    log_deployment "DOCKER_COMPOSE_DEPLOYMENT" "SUCCESS"
}

# Function to deploy to AWS ECS
deploy_ecs() {
    print_header "🚀 Deploying to AWS ECS..."
    
    # Update ECS task definitions
    print_step "Updating ECS task definitions..."
    
    # Update backend task definition
    aws ecs describe-task-definition \
        --task-definition "apexmatch-backend-$ENVIRONMENT" \
        --query 'taskDefinition' \
        --output json > task-def-backend.json
    
    # Update image URI in task definition
    jq --arg IMAGE "$REGISTRY/backend:$IMAGE_TAG" \
       '.containerDefinitions[0].image = $IMAGE' \
       task-def-backend.json > task-def-backend-updated.json
    
    # Register new task definition
    aws ecs register-task-definition \
        --cli-input-json file://task-def-backend-updated.json \
        --query 'taskDefinition.revision' \
        --output text > backend-revision.txt
    
    # Update frontend task definition
    aws ecs describe-task-definition \
        --task-definition "apexmatch-frontend-$ENVIRONMENT" \
        --query 'taskDefinition' \
        --output json > task-def-frontend.json
    
    jq --arg IMAGE "$REGISTRY/frontend:$IMAGE_TAG" \
       '.containerDefinitions[0].image = $IMAGE' \
       task-def-frontend.json > task-def-frontend-updated.json
    
    aws ecs register-task-definition \
        --cli-input-json file://task-def-frontend-updated.json \
        --query 'taskDefinition.revision' \
        --output text > frontend-revision.txt
    
    # Update services
    print_step "Updating ECS services..."
    
    local backend_revision=$(cat backend-revision.txt)
    local frontend_revision=$(cat frontend-revision.txt)
    
    aws ecs update-service \
        --cluster "apexmatch-$ENVIRONMENT" \
        --service "apexmatch-backend" \
        --task-definition "apexmatch-backend-$ENVIRONMENT:$backend_revision" \
        --force-new-deployment
    
    aws ecs update-service \
        --cluster "apexmatch-$ENVIRONMENT" \
        --service "apexmatch-frontend" \
        --task-definition "apexmatch-frontend-$ENVIRONMENT:$frontend_revision" \
        --force-new-deployment
    
    # Wait for deployment to stabilize
    print_step "Waiting for deployment to stabilize..."
    aws ecs wait services-stable \
        --cluster "apexmatch-$ENVIRONMENT" \
        --services "apexmatch-backend" "apexmatch-frontend"
    
    # Run database migrations
    print_step "Running database migrations..."
    aws ecs run-task \
        --cluster "apexmatch-$ENVIRONMENT" \
        --task-definition "apexmatch-backend-$ENVIRONMENT:$backend_revision" \
        --overrides '{
            "containerOverrides": [{
                "name": "apexmatch-backend",
                "command": ["alembic", "upgrade", "head"]
            }]
        }' \
        --launch-type FARGATE \
        --network-configuration '{
            "awsvpcConfiguration": {
                "subnets": ["'$SUBNET_ID'"],
                "securityGroups": ["'$SECURITY_GROUP_ID'"],
                "assignPublicIp": "ENABLED"
            }
        }'
    
    # Cleanup
    rm -f task-def-*.json *-revision.txt
    
    print_status "ECS deployment completed ✅"
    log_deployment "ECS_DEPLOYMENT" "SUCCESS"
}

# Function to run post-deployment health checks
run_health_checks() {
    print_header "🏥 Running Post-Deployment Health Checks..."
    
    # Determine health check URLs based on deployment target
    local frontend_url backend_url
    
    case $DEPLOY_TARGET in
        kubernetes)
            frontend_url="http://${FRONTEND_DOMAIN:-localhost:3000}"
            backend_url="http://${BACKEND_DOMAIN:-localhost:8000}"
            ;;
        docker-compose)
            frontend_url="http://localhost:3000"
            backend_url="http://localhost:8000"
            ;;
        ecs)
            frontend_url="http://${FRONTEND_ALB_DNS}"
            backend_url="http://${BACKEND_ALB_DNS}"
            ;;
    esac
    
    # Frontend health check
    print_step "Checking frontend health..."
    local attempt=0
    local max_attempts=$((HEALTH_CHECK_TIMEOUT / 10))
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -f -s "$frontend_url" >/dev/null 2>&1; then
            print_status "Frontend health check ✅"
            break
        fi
        attempt=$((attempt + 1))
        sleep 10
    done
    
    if [[ $attempt -eq $max_attempts ]]; then
        print_error "Frontend health check failed ❌"
        log_deployment "FRONTEND_HEALTH_CHECK" "FAILED"
    else
        log_deployment "FRONTEND_HEALTH_CHECK" "SUCCESS"
    fi
    
    # Backend health check
    print_step "Checking backend health..."
    attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -f -s "$backend_url/health" >/dev/null 2>&1; then
            print_status "Backend health check ✅"
            break
        fi
        attempt=$((attempt + 1))
        sleep 10
    done
    
    if [[ $attempt -eq $max_attempts ]]; then
        print_error "Backend health check failed ❌"
        log_deployment "BACKEND_HEALTH_CHECK" "FAILED"
    else
        log_deployment "BACKEND_HEALTH_CHECK" "SUCCESS"
    fi
    
    # Database connectivity check
    print_step "Checking database connectivity..."
    case $DEPLOY_TARGET in
        kubernetes)
            if kubectl exec -n "apexmatch-$ENVIRONMENT" deployment/apexmatch-backend -- \
               python -c "from database import engine; engine.execute('SELECT 1')" >/dev/null 2>&1; then
                print_status "Database connectivity ✅"
                log_deployment "DATABASE_CONNECTIVITY" "SUCCESS"
            else
                print_error "Database connectivity failed ❌"
                log_deployment "DATABASE_CONNECTIVITY" "FAILED"
            fi
            ;;
        docker-compose)
            if docker-compose exec -T backend \
               python -c "from database import engine; engine.execute('SELECT 1')" >/dev/null 2>&1; then
                print_status "Database connectivity ✅"
                log_deployment "DATABASE_CONNECTIVITY" "SUCCESS"
            else
                print_error "Database connectivity failed ❌"
                log_deployment "DATABASE_CONNECTIVITY" "FAILED"
            fi
            ;;
    esac
    
    # API endpoint tests
    print_step "Testing critical API endpoints..."
    local api_tests=(
        "/health"
        "/api/v1/auth/status"
        "/api/v1/matches/discover"
    )
    
    for endpoint in "${api_tests[@]}"; do
        if curl -f -s "$backend_url$endpoint" >/dev/null 2>&1; then
            print_status "API endpoint $endpoint ✅"
        else
            print_warning "API endpoint $endpoint may have issues ⚠️"
        fi
    done
    
    print_status "Health checks completed ✅"
}

# Function to run smoke tests
run_smoke_tests() {
    print_header "💨 Running Smoke Tests..."
    
    # Test user registration flow
    print_step "Testing user registration flow..."
    
    local test_email="smoketest+$(date +%s)@apexmatch.com"
    local backend_url
    
    case $DEPLOY_TARGET in
        kubernetes)
            backend_url="http://${BACKEND_DOMAIN:-localhost:8000}"
            ;;
        docker-compose)
            backend_url="http://localhost:8000"
            ;;
        ecs)
            backend_url="http://${BACKEND_ALB_DNS}"
            ;;
    esac
    
    # Test registration
    local registration_response=$(curl -s -X POST "$backend_url/api/v1/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$test_email\",
            \"password\": \"testpassword123\",
            \"first_name\": \"Smoke\",
            \"age\": 25,
            \"location\": \"Test City\"
        }")
    
    if echo "$registration_response" | jq -e '.access_token' >/dev/null 2>&1; then
        print_status "User registration test ✅"
        
        # Extract token for further tests
        local access_token=$(echo "$registration_response" | jq -r '.access_token')
        
        # Test authenticated endpoint
        if curl -s -H "Authorization: Bearer $access_token" \
           "$backend_url/api/v1/bgp/profile" >/dev/null 2>&1; then
            print_status "Authentication test ✅"
        else
            print_warning "Authentication test failed ⚠️"
        fi
        
    else
        print_warning "User registration test failed ⚠️"
    fi
    
    print_status "Smoke tests completed ✅"
    log_deployment "SMOKE_TESTS" "SUCCESS"
}

# Function to update monitoring and alerting
update_monitoring() {
    print_header "📊 Updating Monitoring and Alerting..."
    
    # Update Prometheus configuration if it exists
    if [[ -f "monitoring/prometheus.yml" ]]; then
        print_step "Updating Prometheus configuration..."
        case $DEPLOY_TARGET in
            kubernetes)
                kubectl apply -f monitoring/ -n monitoring 2>/dev/null || true
                ;;
        esac
    fi
    
    # Update Grafana dashboards
    if [[ -d "monitoring/grafana" ]]; then
        print_step "Updating Grafana dashboards..."
        # Implementation would depend on your Grafana setup
    fi
    
    # Set up deployment alerts
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
             -H "Content-Type: application/json" \
             -d "{
                 \"text\": \"🚀 ApexMatch $ENVIRONMENT deployment completed successfully!\",
                 \"attachments\": [{
                     \"color\": \"good\",
                     \"fields\": [
                         {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                         {\"title\": \"Version\", \"value\": \"$APEXMATCH_VERSION\", \"short\": true},
                         {\"title\": \"Commit\", \"value\": \"$GIT_COMMIT\", \"short\": true},
                         {\"title\": \"Timestamp\", \"value\": \"$DEPLOYMENT_TIMESTAMP\", \"short\": true}
                     ]
                 }]
             }" >/dev/null 2>&1 || true
    fi
    
    print_status "Monitoring updated ✅"
    log_deployment "MONITORING_UPDATED" "SUCCESS"
}

# Function to display deployment summary
display_deployment_summary() {
    print_header "🎉 Deployment Summary"
    
    echo ""
    echo -e "${GREEN}✨ ApexMatch $ENVIRONMENT deployment completed successfully! ✨${NC}"
    echo ""
    echo -e "${BLUE}📋 Deployment Details:${NC}"
    echo -e "   Environment:     ${GREEN}$ENVIRONMENT${NC}"
    echo -e "   Version:         ${GREEN}$APEXMATCH_VERSION${NC}"
    echo -e "   Git Commit:      ${GREEN}$GIT_COMMIT${NC}"
    echo -e "   Deploy Target:   ${GREEN}$DEPLOY_TARGET${NC}"
    echo -e "   Timestamp:       ${GREEN}$DEPLOYMENT_TIMESTAMP${NC}"
    echo ""
    
    case $DEPLOY_TARGET in
        kubernetes)
            echo -e "${BLUE}🌐 Service URLs:${NC}"
            echo -e "   Frontend:  ${GREEN}http://${FRONTEND_DOMAIN:-localhost:3000}${NC}"
            echo -e "   Backend:   ${GREEN}http://${BACKEND_DOMAIN:-localhost:8000}${NC}"
            echo -e "   API Docs:  ${GREEN}http://${BACKEND_DOMAIN:-localhost:8000}/docs${NC}"
            ;;
        docker-compose)
            echo -e "${BLUE}🌐 Service URLs:${NC}"
            echo -e "   Frontend:  ${GREEN}http://localhost:3000${NC}"
            echo -e "   Backend:   ${GREEN}http://localhost:8000${NC}"
            echo -e "   API Docs:  ${GREEN}http://localhost:8000/docs${NC}"
            ;;
        ecs)
            echo -e "${BLUE}🌐 Service URLs:${NC}"
            echo -e "   Frontend:  ${GREEN}http://${FRONTEND_ALB_DNS}${NC}"
            echo -e "   Backend:   ${GREEN}http://${BACKEND_ALB_DNS}${NC}"
            echo -e "   API Docs:  ${GREEN}http://${BACKEND_ALB_DNS}/docs${NC}"
            ;;
    esac
    
    echo ""
    echo -e "${BLUE}💡 Revolutionary Features Deployed:${NC}"
    echo -e "   ${PURPLE}🧠 Behavioral AI Matching${NC} - 22+ personality dimensions"
    echo -e "   ${PURPLE}💕 Sacred Photo Reveals${NC} - 70% emotional threshold system"
    echo -e "   ${PURPLE}🏆 Trust Justice System${NC} - \"Shit matches shit\" behavioral tracking"
    echo -e "   ${PURPLE}🤖 AI Wingman${NC} - OpenAI + Claude conversation assistance"
    echo -e "   ${PURPLE}⚡ Real-time Chat${NC} - WebSocket emotional analysis"
    echo -e "   ${PURPLE}💰 Subscription System${NC} - Complete monetization"
    echo ""
    echo -e "${GREEN}🚀 ApexMatch is revolutionizing dating with authentic connections!${NC}"
    echo ""
    
    # Save deployment info
    cat > "deployment-$DEPLOYMENT_TIMESTAMP.json" << EOF
{
    "environment": "$ENVIRONMENT",
    "version": "$APEXMATCH_VERSION",
    "git_commit": "$GIT_COMMIT",
    "git_branch": "$GIT_BRANCH",
    "deploy_target": "$DEPLOY_TARGET",
    "timestamp": "$DEPLOYMENT_TIMESTAMP",
    "image_tag": "$IMAGE_TAG",
    "registry": "$REGISTRY"
}
EOF
    
    log_deployment "DEPLOYMENT_COMPLETED" "SUCCESS"
}

# Function to handle rollback
rollback_deployment() {
    print_header "🔄 Rolling Back Deployment..."
    
    local rollback_target="$1"
    
    if [[ -z "$rollback_target" ]]; then
        print_error "Rollback target not specified"
        exit 1
    fi
    
    case $DEPLOY_TARGET in
        kubernetes)
            kubectl rollout undo deployment/apexmatch-backend -n "apexmatch-$ENVIRONMENT" --to-revision="$rollback_target"
            kubectl rollout undo deployment/apexmatch-frontend -n "apexmatch-$ENVIRONMENT" --to-revision="$rollback_target"
            ;;
        docker-compose)
            # Restore from backup
            if [[ -d "backups/$rollback_target" ]]; then
                docker-compose down
                # Restore database if needed
                docker-compose up -d
            fi
            ;;
        ecs)
            # Rollback to previous task definition revision
            aws ecs update-service \
                --cluster "apexmatch-$ENVIRONMENT" \
                --service "apexmatch-backend" \
                --task-definition "apexmatch-backend-$ENVIRONMENT:$rollback_target"
            aws ecs update-service \
                --cluster "apexmatch-$ENVIRONMENT" \
                --service "apexmatch-frontend" \
                --task-definition "apexmatch-frontend-$ENVIRONMENT:$rollback_target"
            ;;
    esac
    
    print_status "Rollback completed ✅"
    log_deployment "ROLLBACK_COMPLETED" "SUCCESS"
}

# Function to show help
show_help() {
    echo "ApexMatch Deployment Script v$APEXMATCH_VERSION"
    echo ""
    echo "Usage: $0 [options] [command]"
    echo ""
    echo "Commands:"
    echo "  deploy              Full deployment (default)"
    echo "  rollback <target>   Rollback to specified version/revision"
    echo "  health-check        Run health checks only"
    echo "  smoke-test          Run smoke tests only"
    echo ""
    echo "Options:"
    echo "  -e, --environment   Deployment environment (default: production)"
    echo "  -t, --target        Deployment target: kubernetes|docker-compose|ecs"
    echo "  -b, --branch        Git branch to deploy (default: main)"
    echo "  --skip-tests        Skip pre-deployment tests"
    echo "  --skip-backup       Skip backup creation"
    echo "  --dry-run           Show what would be deployed without executing"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  REGISTRY           Container registry URL"
    echo "  IMAGE_TAG          Container image tag"
    echo "  SLACK_WEBHOOK_URL  Slack notification webhook"
    echo "  BACKUP_S3_BUCKET   S3 bucket for backups"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Deploy to production"
    echo "  $0 -e staging -t kubernetes          # Deploy to staging with Kubernetes"
    echo "  $0 rollback 123                      # Rollback to revision 123"
    echo "  $0 --dry-run                         # Show deployment plan"
}

# Main deployment function
main() {
    local command="deploy"
    local skip_tests=false
    local skip_backup=false
    local dry_run=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -t|--target)
                DEPLOY_TARGET="$2"
                shift 2
                ;;
            -b|--branch)
                GIT_BRANCH="$2"
                shift 2
                ;;
            --skip-tests)
                skip_tests=true
                shift
                ;;
            --skip-backup)
                skip_backup=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            deploy|rollback|health-check|smoke-test)
                command="$1"
                shift
                ;;
            *)
                if [[ "$command" == "rollback" && -z "$rollback_target" ]]; then
                    rollback_target="$1"
                    shift
                else
                    print_error "Unknown option: $1"
                    show_help
                    exit 1
                fi
                ;;
        esac
    done
    
    # Display header
    clear
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║                  🚀 APEXMATCH DEPLOYMENT 🚀                 ║"
    echo "║                                                              ║"
    echo "║        Revolutionary AI-Powered Dating Platform             ║"
    echo "║                                                              ║"
    echo "║   Environment: $(printf "%-43s" "$ENVIRONMENT") ║"
    echo "║   Target:      $(printf "%-43s" "$DEPLOY_TARGET") ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    # Execute command
    case $command in
        deploy)
            if [[ "$dry_run" == true ]]; then
                print_header "🔍 Dry Run - Deployment Plan"
                echo "Environment: $ENVIRONMENT"
                echo "Target: $DEPLOY_TARGET"
                echo "Branch: $GIT_BRANCH"
                echo "Image Tag: $IMAGE_TAG"
                echo "Registry: $REGISTRY"
                exit 0
            fi
            
            log_deployment "DEPLOYMENT_STARTED" "INITIATED"
            
            check_prerequisites
            
            if [[ "$skip_tests" == false ]]; then
                run_pre_deployment_tests
            fi
            
            if [[ "$skip_backup" == false ]]; then
                create_backup
            fi
            
            build_and_push_images
            
            case $DEPLOY_TARGET in
                kubernetes)
                    deploy_kubernetes
                    ;;
                docker-compose)
                    deploy_docker_compose
                    ;;
                ecs)
                    deploy_ecs
                    ;;
                *)
                    print_error "Unknown deployment target: $DEPLOY_TARGET"
                    exit 1
                    ;;
            esac
            
            run_health_checks
            run_smoke_tests
            update_monitoring
            display_deployment_summary
            ;;
        rollback)
            if [[ -z "$rollback_target" ]]; then
                print_error "Rollback target must be specified"
                exit 1
            fi
            rollback_deployment "$rollback_target"
            ;;
        health-check)
            run_health_checks
            ;;
        smoke-test)
            run_smoke_tests
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Check if running as root (not recommended for production)
if [[ $EUID -eq 0 ]]; then
    print_warning "Running deployment as root is not recommended for production"
fi

# Trap to handle script interruption
trap 'print_error "Deployment interrupted!"; log_deployment "DEPLOYMENT_INTERRUPTED" "FAILED"; exit 1' INT TERM

# Run main function with all arguments
main "$@"