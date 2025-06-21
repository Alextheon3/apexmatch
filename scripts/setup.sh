#!/bin/bash

# ApexMatch Platform Setup Script
# Automated setup for the revolutionary dating platform

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
APEXMATCH_VERSION="1.0.0"
MIN_DOCKER_VERSION="20.0.0"
MIN_DOCKER_COMPOSE_VERSION="2.0.0"

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to compare versions
version_compare() {
    local version1=$1
    local version2=$2
    if [[ "$(printf '%s\n' "$version1" "$version2" | sort -V | head -n1)" == "$version1" ]]; then
        return 0
    else
        return 1
    fi
}

# Function to check system requirements
check_system_requirements() {
    print_header "🔍 Checking System Requirements..."
    
    # Check OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        print_status "Operating System: Linux ✅"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        print_status "Operating System: macOS ✅"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        print_status "Operating System: Windows ✅"
    else
        print_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
    
    # Check available disk space (minimum 10GB)
    available_space=$(df . | awk 'NR==2 {print $4}')
    required_space=10485760  # 10GB in KB
    
    if [[ "$available_space" -gt "$required_space" ]]; then
        print_status "Disk Space: $(($available_space / 1024 / 1024))GB available ✅"
    else
        print_error "Insufficient disk space. Required: 10GB, Available: $(($available_space / 1024 / 1024))GB"
        exit 1
    fi
    
    # Check RAM (minimum 4GB)
    if command_exists free; then
        total_ram=$(free -m | awk 'NR==2{print $2}')
        if [[ "$total_ram" -gt 4096 ]]; then
            print_status "RAM: ${total_ram}MB available ✅"
        else
            print_warning "Low RAM: ${total_ram}MB (4GB+ recommended)"
        fi
    fi
}

# Function to install Docker
install_docker() {
    print_header "🐳 Installing Docker..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Install Docker on Linux
        if command_exists apt-get; then
            # Ubuntu/Debian
            sudo apt-get update
            sudo apt-get install -y ca-certificates curl gnupg lsb-release
            
            # Add Docker's official GPG key
            sudo mkdir -p /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            
            # Set up repository
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            
            # Install Docker Engine
            sudo apt-get update
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            
        elif command_exists yum; then
            # CentOS/RHEL
            sudo yum install -y yum-utils
            sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            sudo systemctl start docker
            sudo systemctl enable docker
        fi
        
        # Add user to docker group
        sudo usermod -aG docker $USER
        print_status "Docker installed successfully! Please log out and back in for group changes to take effect."
        
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command_exists brew; then
            brew install --cask docker
            print_status "Docker installed via Homebrew. Please start Docker Desktop manually."
        else
            print_error "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
            exit 1
        fi
        
    else
        print_error "Please install Docker manually for your operating system"
        exit 1
    fi
}

# Function to check Docker installation
check_docker() {
    print_header "🐳 Checking Docker Installation..."
    
    if ! command_exists docker; then
        print_warning "Docker not found. Installing..."
        install_docker
        return
    fi
    
    # Check Docker version
    docker_version=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    if version_compare "$MIN_DOCKER_VERSION" "$docker_version"; then
        print_status "Docker version: $docker_version ✅"
    else
        print_error "Docker version $docker_version is too old. Minimum required: $MIN_DOCKER_VERSION"
        exit 1
    fi
    
    # Check Docker Compose
    if docker compose version >/dev/null 2>&1; then
        compose_version=$(docker compose version --short)
        if version_compare "$MIN_DOCKER_COMPOSE_VERSION" "$compose_version"; then
            print_status "Docker Compose version: $compose_version ✅"
        else
            print_error "Docker Compose version $compose_version is too old. Minimum required: $MIN_DOCKER_COMPOSE_VERSION"
            exit 1
        fi
    else
        print_error "Docker Compose not found. Please install Docker Compose."
        exit 1
    fi
    
    # Test Docker daemon
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi
    
    print_status "Docker is properly configured ✅"
}

# Function to setup environment files
setup_environment() {
    print_header "🔧 Setting Up Environment Configuration..."
    
    # Copy environment template if it doesn't exist
    if [[ ! -f .env ]]; then
        if [[ -f .env.example ]]; then
            cp .env.example .env
            print_status "Created .env from template"
        else
            print_error ".env.example not found. Please ensure you're in the correct directory."
            exit 1
        fi
    else
        print_status ".env file already exists"
    fi
    
    # Generate secure keys
    print_status "Generating secure keys..."
    
    # Generate JWT secret key
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || head /dev/urandom | tr -dc A-Za-z0-9 | head -c 64)
    
    # Generate database password
    DB_PASSWORD=$(openssl rand -base64 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_urlsafe(32))" 2>/dev/null || head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32)
    
    # Generate Redis password
    REDIS_PASSWORD=$(openssl rand -base64 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_urlsafe(32))" 2>/dev/null || head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32)
    
    # Update .env file with generated values
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS sed syntax
        sed -i '' "s/your-super-secret-jwt-key-change-this/$JWT_SECRET/g" .env
        sed -i '' "s/secure_password/$DB_PASSWORD/g" .env
        sed -i '' "s/redis_secure_password/$REDIS_PASSWORD/g" .env
    else
        # Linux sed syntax
        sed -i "s/your-super-secret-jwt-key-change-this/$JWT_SECRET/g" .env
        sed -i "s/secure_password/$DB_PASSWORD/g" .env
        sed -i "s/redis_secure_password/$REDIS_PASSWORD/g" .env
    fi
    
    print_status "Generated secure JWT secret ✅"
    print_status "Generated secure database password ✅"
    print_status "Generated secure Redis password ✅"
    
    # Setup frontend environment
    if [[ -d "frontend" ]]; then
        if [[ ! -f "frontend/.env.local" ]] && [[ -f "frontend/.env.example" ]]; then
            cp frontend/.env.example frontend/.env.local
            print_status "Created frontend/.env.local from template"
        fi
    fi
}

# Function to check external service requirements
check_external_services() {
    print_header "🔗 Checking External Service Configuration..."
    
    # Check if API keys are configured
    if grep -q "sk-your-openai-api-key-here" .env; then
        print_warning "OpenAI API key not configured. AI Wingman features will be limited."
    else
        print_status "OpenAI API key configured ✅"
    fi
    
    if grep -q "sk-ant-your-anthropic-api-key-here" .env; then
        print_warning "Anthropic API key not configured. Claude AI features will be limited."
    else
        print_status "Anthropic API key configured ✅"
    fi
    
    if grep -q "sk_test_your_stripe_secret_key" .env; then
        print_warning "Stripe API keys not configured. Payment features will not work."
    else
        print_status "Stripe API keys configured ✅"
    fi
    
    if grep -q "SG.your-sendgrid-api-key" .env; then
        print_warning "SendGrid API key not configured. Email features will not work."
    else
        print_status "SendGrid API key configured ✅"
    fi
    
    if grep -q "your-aws-access-key" .env; then
        print_warning "AWS credentials not configured. Photo storage will use local storage."
    else
        print_status "AWS credentials configured ✅"
    fi
}

# Function to build and start services
start_services() {
    print_header "🚀 Building and Starting ApexMatch Services..."
    
    # Pull latest images
    print_status "Pulling base Docker images..."
    docker compose pull --quiet
    
    # Build services
    print_status "Building ApexMatch containers..."
    docker compose build --parallel
    
    # Start services
    print_status "Starting all services..."
    docker compose up -d
    
    # Wait for services to be healthy
    print_status "Waiting for services to be ready..."
    
    # Wait for database
    max_attempts=30
    attempt=0
    while [[ $attempt -lt $max_attempts ]]; do
        if docker compose exec -T postgres pg_isready -U apexmatch >/dev/null 2>&1; then
            print_status "Database is ready ✅"
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    if [[ $attempt -eq $max_attempts ]]; then
        print_error "Database failed to start within 60 seconds"
        exit 1
    fi
    
    # Wait for Redis
    attempt=0
    while [[ $attempt -lt $max_attempts ]]; do
        if docker compose exec -T redis redis-cli ping >/dev/null 2>&1; then
            print_status "Redis is ready ✅"
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    # Wait for backend API
    attempt=0
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -f http://localhost:8000/health >/dev/null 2>&1; then
            print_status "Backend API is ready ✅"
            break
        fi
        attempt=$((attempt + 1))
        sleep 3
    done
    
    # Wait for frontend
    attempt=0
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -f http://localhost:3000 >/dev/null 2>&1; then
            print_status "Frontend is ready ✅"
            break
        fi
        attempt=$((attempt + 1))
        sleep 3
    done
}

# Function to run database migrations
setup_database() {
    print_header "🗄️ Setting Up Database..."
    
    print_status "Running database migrations..."
    docker compose exec backend alembic upgrade head
    
    print_status "Database setup completed ✅"
}

# Function to create sample data
create_sample_data() {
    print_header "📊 Creating Sample Data..."
    
    # Check if sample data script exists
    if docker compose exec backend test -f scripts/create_sample_data.py; then
        print_status "Creating sample users and profiles..."
        docker compose exec backend python scripts/create_sample_data.py
        print_status "Sample data created ✅"
    else
        print_warning "Sample data script not found. Skipping..."
    fi
}

# Function to run health checks
run_health_checks() {
    print_header "🏥 Running Health Checks..."
    
    # Check backend API
    if curl -f http://localhost:8000/health >/dev/null 2>&1; then
        print_status "Backend API health check ✅"
    else
        print_error "Backend API health check failed ❌"
    fi
    
    # Check frontend
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        print_status "Frontend health check ✅"
    else
        print_error "Frontend health check failed ❌"
    fi
    
    # Check database connection
    if docker compose exec -T backend python -c "
from database import engine
try:
    engine.execute('SELECT 1')
    print('Database connection ✅')
except Exception as e:
    print('Database connection ❌')
    exit(1)
" 2>/dev/null; then
        print_status "Database connection ✅"
    else
        print_error "Database connection failed ❌"
    fi
    
    # Check Redis connection
    if docker compose exec -T redis redis-cli ping >/dev/null 2>&1; then
        print_status "Redis connection ✅"
    else
        print_error "Redis connection failed ❌"
    fi
}

# Function to display success message
display_success() {
    print_header "🎉 ApexMatch Setup Complete!"
    
    echo ""
    echo -e "${GREEN}✨ Your revolutionary dating platform is now running! ✨${NC}"
    echo ""
    echo -e "${BLUE}🌐 Access your platform:${NC}"
    echo -e "   Frontend:  ${GREEN}http://localhost:3000${NC}"
    echo -e "   Backend:   ${GREEN}http://localhost:8000${NC}"
    echo -e "   API Docs:  ${GREEN}http://localhost:8000/docs${NC}"
    echo ""
    echo -e "${BLUE}🔧 Development tools:${NC}"
    echo -e "   PgAdmin:   ${GREEN}http://localhost:5050${NC} (admin@admin.com / admin)"
    echo -e "   MailHog:   ${GREEN}http://localhost:8025${NC} (email testing)"
    echo ""
    echo -e "${BLUE}💡 What you just built:${NC}"
    echo -e "   ${PURPLE}🧠 Behavioral AI Matching${NC} - 22+ personality dimensions"
    echo -e "   ${PURPLE}💕 Sacred Photo Reveals${NC} - 70% emotional threshold system"
    echo -e "   ${PURPLE}🏆 Trust Justice System${NC} - \"Shit matches shit\" behavioral tracking"
    echo -e "   ${PURPLE}🤖 AI Wingman${NC} - OpenAI + Claude conversation assistance"
    echo -e "   ${PURPLE}⚡ Real-time Chat${NC} - WebSocket emotional analysis"
    echo -e "   ${PURPLE}💰 Subscription System${NC} - Complete monetization"
    echo ""
    echo -e "${BLUE}📚 Next steps:${NC}"
    echo -e "   1. Configure external API keys in ${GREEN}.env${NC}"
    echo -e "   2. Customize branding and UI"
    echo -e "   3. Set up production deployment"
    echo -e "   4. Read ${GREEN}SETUP.md${NC} for detailed configuration"
    echo ""
    echo -e "${YELLOW}⚠️  Don't forget to configure your external services:${NC}"
    echo -e "   - OpenAI API key for AI Wingman"
    echo -e "   - Anthropic API key for Claude AI"
    echo -e "   - Stripe keys for payments"
    echo -e "   - SendGrid key for emails"
    echo -e "   - AWS credentials for photo storage"
    echo ""
    echo -e "${GREEN}🚀 Welcome to the future of authentic dating!${NC}"
}

# Function to handle script options
show_help() {
    echo "ApexMatch Setup Script v$APEXMATCH_VERSION"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help           Show this help message"
    echo "  -q, --quick          Skip interactive prompts"
    echo "  -s, --sample-data    Create sample data after setup"
    echo "  --no-build           Skip building containers (use existing images)"
    echo "  --check-only         Only run system checks, don't install"
    echo ""
    echo "Examples:"
    echo "  $0                   # Interactive setup"
    echo "  $0 -q                # Quick setup with defaults"
    echo "  $0 -s                # Setup with sample data"
    echo "  $0 --check-only      # Just check system requirements"
}

# Main setup function
main() {
    local quick_mode=false
    local create_samples=false
    local no_build=false
    local check_only=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -q|--quick)
                quick_mode=true
                shift
                ;;
            -s|--sample-data)
                create_samples=true
                shift
                ;;
            --no-build)
                no_build=true
                shift
                ;;
            --check-only)
                check_only=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Display header
    clear
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║                    ❤️  APEXMATCH SETUP ❤️                    ║"
    echo "║                                                              ║"
    echo "║        Revolutionary AI-Powered Dating Platform             ║"
    echo "║                                                              ║"
    echo "║   🧠 Behavioral Matching • 💕 Sacred Photo Reveals          ║"
    echo "║   🏆 Trust System • 🤖 AI Wingman • ⚡ Real-time Chat      ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    # Check system requirements
    check_system_requirements
    
    # Check Docker installation
    check_docker
    
    if [[ "$check_only" == true ]]; then
        print_status "System check completed successfully! ✅"
        exit 0
    fi
    
    # Interactive confirmation
    if [[ "$quick_mode" == false ]]; then
        echo ""
        echo -e "${YELLOW}This script will:${NC}"
        echo "  • Set up environment configuration with secure keys"
        echo "  • Build and start all ApexMatch services"
        echo "  • Initialize the database with migrations"
        echo "  • Run health checks to verify everything works"
        echo ""
        read -p "Continue with setup? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Setup cancelled by user."
            exit 0
        fi
    fi
    
    # Run setup steps
    setup_environment
    check_external_services
    
    if [[ "$no_build" == false ]]; then
        start_services
        setup_database
        
        if [[ "$create_samples" == true ]]; then
            create_sample_data
        fi
        
        run_health_checks
    fi
    
    display_success
}

# Check if running with sudo (not recommended)
if [[ $EUID -eq 0 ]]; then
    print_warning "Running as root is not recommended. Please run as a regular user."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Run main function with all arguments
main "$@"