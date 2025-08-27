#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Docker Hub organization/username
DOCKER_ORG="chbornman"

# Function to check if image exists on Docker Hub
check_docker_hub() {
    local image=$1
    local tag=$2

    # Check if image:tag exists on Docker Hub
    if docker manifest inspect ${DOCKER_ORG}/${image}:${tag} > /dev/null 2>&1; then
        return 0  # Image exists
    else
        return 1  # Image doesn't exist
    fi
}

# Function to increment version
increment_version() {
    local version=$1
    local part=$2

    IFS='.' read -ra PARTS <<< "$version"

    case $part in
        major)
            echo "$((PARTS[0] + 1)).0.0"
            ;;
        minor)
            echo "${PARTS[0]}.$((PARTS[1] + 1)).0"
            ;;
        patch)
            echo "${PARTS[0]}.${PARTS[1]}.$((PARTS[2] + 1))"
            ;;
        *)
            echo "$version"
            ;;
    esac
}

# Function to update backend version
update_backend_version() {
    local new_version=$1
    cd backend

    # Update Cargo.toml
    sed -i.bak "s/^version = \".*\"/version = \"$new_version\"/" Cargo.toml
    rm Cargo.toml.bak

    # Update Cargo.lock
    cargo update --workspace

    echo -e "${GREEN}Updated backend version to ${new_version}${NC}"
}

# Function to update frontend version
update_frontend_version() {
    local new_version=$1
    cd frontend

    # Update package.json using sed (works with both npm and bun)
    sed -i.bak "s/\"version\": \".*\"/\"version\": \"$new_version\"/" package.json
    rm package.json.bak

    echo -e "${GREEN}Updated frontend version to ${new_version}${NC}"
}

# Function to handle version conflict
handle_version_conflict() {
    local component=$1
    local current_version=$2
    local image_name=$3

    echo ""
    echo -e "${YELLOW}Version ${current_version} of ${component} already exists on Docker Hub${NC}"
    echo -e "${BLUE}What would you like to do?${NC}"
    echo "  1) Skip building ${component}"
    echo "  2) Increment patch version (to $(increment_version $current_version patch))"
    echo "  3) Increment minor version (to $(increment_version $current_version minor))"
    echo "  4) Increment major version (to $(increment_version $current_version major))"
    echo "  5) Force rebuild with same version (overwrites existing)"
    echo "  6) Exit"

    read -p "Select option (1-6): " choice

    case $choice in
        1)
            echo -e "${YELLOW}Skipping ${component}...${NC}"
            return 1
            ;;
        2)
            new_version=$(increment_version $current_version patch)
            if [ "$component" = "backend" ]; then
                update_backend_version $new_version
            else
                update_frontend_version $new_version
            fi
            return 0
            ;;
        3)
            new_version=$(increment_version $current_version minor)
            if [ "$component" = "backend" ]; then
                update_backend_version $new_version
            else
                update_frontend_version $new_version
            fi
            return 0
            ;;
        4)
            new_version=$(increment_version $current_version major)
            if [ "$component" = "backend" ]; then
                update_backend_version $new_version
            else
                update_frontend_version $new_version
            fi
            return 0
            ;;
        5)
            echo -e "${YELLOW}Warning: This will overwrite the existing image on Docker Hub!${NC}"
            read -p "Are you sure? (y/N): " confirm
            if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                return 0
            else
                return 1
            fi
            ;;
        6)
            echo -e "${RED}Exiting...${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option. Exiting...${NC}"
            exit 1
            ;;
    esac
}

# Parse arguments
PUSH_TO_HUB=false
INTERACTIVE=true

for arg in "$@"; do
    case $arg in
        --push)
            PUSH_TO_HUB=true
            ;;
        --non-interactive|-n)
            INTERACTIVE=false
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --push              Push images to Docker Hub after building"
            echo "  --non-interactive   Exit on version conflicts instead of prompting"
            echo "  -n                  Same as --non-interactive"
            echo "  --help, -h          Show this help message"
            exit 0
            ;;
    esac
done

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Check versions first
echo -e "${BLUE}=== Checking Versions ===${NC}"
echo ""

# Get backend version
cd "$PROJECT_ROOT/backend"
BACKEND_VERSION=$(grep '^version' Cargo.toml | head -1 | cut -d'"' -f2)
echo -e "${YELLOW}Backend current version: ${BACKEND_VERSION}${NC}"

# Get frontend version
cd "$PROJECT_ROOT/frontend"
FRONTEND_VERSION=$(grep '"version"' package.json | head -1 | sed -E 's/.*"version": "([^"]+)".*/\1/')
echo -e "${YELLOW}Frontend current version: ${FRONTEND_VERSION}${NC}"

echo ""
echo -e "${BLUE}=== Checking Docker Hub ===${NC}"

# Check backend version on Docker Hub
BUILD_BACKEND=true
BACKEND_VERSION_CONFLICT=false
echo -e "${YELLOW}Checking Docker Hub for likert-or-not-backend:${BACKEND_VERSION}...${NC}"
if check_docker_hub "likert-or-not-backend" "${BACKEND_VERSION}"; then
    BACKEND_VERSION_CONFLICT=true
    echo -e "${RED}✗ Backend version ${BACKEND_VERSION} already exists on Docker Hub${NC}"
else
    echo -e "${GREEN}✓ Backend version ${BACKEND_VERSION} is available${NC}"
fi

# Check frontend version on Docker Hub
BUILD_FRONTEND=true
FRONTEND_VERSION_CONFLICT=false
echo -e "${YELLOW}Checking Docker Hub for likert-or-not-frontend:${FRONTEND_VERSION}...${NC}"
if check_docker_hub "likert-or-not-frontend" "${FRONTEND_VERSION}"; then
    FRONTEND_VERSION_CONFLICT=true
    echo -e "${RED}✗ Frontend version ${FRONTEND_VERSION} already exists on Docker Hub${NC}"
else
    echo -e "${GREEN}✓ Frontend version ${FRONTEND_VERSION} is available${NC}"
fi

# Handle conflicts if any exist
if [ "$BACKEND_VERSION_CONFLICT" = true ] || [ "$FRONTEND_VERSION_CONFLICT" = true ]; then
    echo ""
    echo -e "${YELLOW}=== Version Conflicts Detected ===${NC}"

    # Handle backend conflict
    if [ "$BACKEND_VERSION_CONFLICT" = true ]; then
        echo ""
        echo -e "${YELLOW}Backend:${NC}"
        cd "$PROJECT_ROOT/backend"
        if [ "$INTERACTIVE" = true ]; then
            if handle_version_conflict "backend" "$BACKEND_VERSION" "likert-or-not-backend"; then
                # Re-read version after potential update
                BACKEND_VERSION=$(grep '^version' Cargo.toml | head -1 | cut -d'"' -f2)
                echo -e "${GREEN}✓ Backend will be built with version ${BACKEND_VERSION}${NC}"
            else
                BUILD_BACKEND=false
                echo -e "${YELLOW}⊘ Backend build skipped${NC}"
            fi
        else
            echo -e "${RED}Error: Backend version ${BACKEND_VERSION} already exists on Docker Hub!${NC}"
            echo -e "${RED}Please update the version in backend/Cargo.toml${NC}"
            exit 1
        fi
    fi

    # Handle frontend conflict
    if [ "$FRONTEND_VERSION_CONFLICT" = true ]; then
        echo ""
        echo -e "${YELLOW}Frontend:${NC}"
        cd "$PROJECT_ROOT/frontend"
        if [ "$INTERACTIVE" = true ]; then
            if handle_version_conflict "frontend" "$FRONTEND_VERSION" "likert-or-not-frontend"; then
                # Re-read version after potential update
                FRONTEND_VERSION=$(grep '"version"' package.json | head -1 | sed -E 's/.*"version": "([^"]+)".*/\1/')
                echo -e "${GREEN}✓ Frontend will be built with version ${FRONTEND_VERSION}${NC}"
            else
                BUILD_FRONTEND=false
                echo -e "${YELLOW}⊘ Frontend build skipped${NC}"
            fi
        else
            echo -e "${RED}Error: Frontend version ${FRONTEND_VERSION} already exists on Docker Hub!${NC}"
            echo -e "${RED}Please update the version in frontend/package.json${NC}"
            exit 1
        fi
    fi
fi

# Show build plan
echo ""
echo -e "${BLUE}=== Build Plan ===${NC}"
if [ "$BUILD_BACKEND" = true ]; then
    echo -e "  ${GREEN}✓${NC} Backend: ${BACKEND_VERSION}"
else
    echo -e "  ${YELLOW}⊘${NC} Backend: Skipped"
fi
if [ "$BUILD_FRONTEND" = true ]; then
    echo -e "  ${GREEN}✓${NC} Frontend: ${FRONTEND_VERSION}"
else
    echo -e "  ${YELLOW}⊘${NC} Frontend: Skipped"
fi

if [ "$BUILD_BACKEND" = false ] && [ "$BUILD_FRONTEND" = false ]; then
    echo ""
    echo -e "${YELLOW}Nothing to build. Exiting.${NC}"
    exit 0
fi

echo ""
read -p "Proceed with build? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo -e "${YELLOW}Build cancelled.${NC}"
    exit 0
fi

# Setup buildx for multi-platform builds (if not already done)
echo ""
echo -e "${BLUE}=== Setting up Docker Buildx ===${NC}"
if ! docker buildx ls | grep -q "multiplatform"; then
    echo -e "${YELLOW}Creating multiplatform builder...${NC}"
    docker buildx create --name multiplatform --driver docker-container --use
    docker buildx inspect --bootstrap
    echo -e "${GREEN}✓ Multiplatform builder created${NC}"
else
    docker buildx use multiplatform
    echo -e "${GREEN}✓ Using existing multiplatform builder${NC}"
fi

# Build Backend
if [ "$BUILD_BACKEND" = true ]; then
    echo ""
    echo -e "${GREEN}=== Building Backend ===${NC}"
    cd "$PROJECT_ROOT"
    echo -e "${YELLOW}Building backend Docker image version ${BACKEND_VERSION} for linux/amd64...${NC}"

    if [ "$PUSH_TO_HUB" = true ]; then
        # Build and push in one step (more efficient)
        docker buildx build \
            --platform linux/amd64 \
            -f backend/Dockerfile \
            --build-arg VERSION=${BACKEND_VERSION} \
            -t ${DOCKER_ORG}/likert-or-not-backend:${BACKEND_VERSION} \
            -t ${DOCKER_ORG}/likert-or-not-backend:latest \
            --push \
            .
        echo -e "${GREEN}✓ Backend built and pushed successfully${NC}"
    else
        # Build locally (will create manifest for platform)
        docker buildx build \
            --platform linux/amd64 \
            -f backend/Dockerfile \
            --build-arg VERSION=${BACKEND_VERSION} \
            -t ${DOCKER_ORG}/likert-or-not-backend:${BACKEND_VERSION} \
            -t ${DOCKER_ORG}/likert-or-not-backend:latest \
            --load \
            .
        echo -e "${GREEN}✓ Backend built successfully${NC}"
    fi
fi

# Build Frontend
if [ "$BUILD_FRONTEND" = true ]; then
    echo ""
    echo -e "${GREEN}=== Building Frontend ===${NC}"
    cd "$PROJECT_ROOT/frontend"
    echo -e "${YELLOW}Building frontend Docker image version ${FRONTEND_VERSION} for linux/amd64...${NC}"

    if [ "$PUSH_TO_HUB" = true ]; then
        # Build and push in one step
        docker buildx build \
            --platform linux/amd64 \
            --build-arg VITE_API_URL="${VITE_API_URL:-/api}" \
            -t ${DOCKER_ORG}/likert-or-not-frontend:${FRONTEND_VERSION} \
            -t ${DOCKER_ORG}/likert-or-not-frontend:latest \
            --push \
            .
        echo -e "${GREEN}✓ Frontend built and pushed successfully${NC}"
    else
        # Build locally
        docker buildx build \
            --platform linux/amd64 \
            --build-arg VITE_API_URL="${VITE_API_URL:-/api}" \
            -t ${DOCKER_ORG}/likert-or-not-frontend:${FRONTEND_VERSION} \
            -t ${DOCKER_ORG}/likert-or-not-frontend:latest \
            --load \
            .
        echo -e "${GREEN}✓ Frontend built successfully${NC}"
    fi
fi

# Summary
echo ""
echo -e "${GREEN}=== Build Summary ===${NC}"
if [ "$BUILD_BACKEND" = true ]; then
    echo -e "  ${GREEN}✓${NC} Backend: ${BACKEND_VERSION}"
else
    echo -e "  ${YELLOW}⊘${NC} Backend: Skipped"
fi

if [ "$BUILD_FRONTEND" = true ]; then
    echo -e "  ${GREEN}✓${NC} Frontend: ${FRONTEND_VERSION}"
else
    echo -e "  ${YELLOW}⊘${NC} Frontend: Skipped"
fi

# Push to Docker Hub if requested
if [ "$PUSH_TO_HUB" = true ]; then
    # When using --push flag, images are already pushed during build with buildx
    if [ "$BUILD_BACKEND" = true ] || [ "$BUILD_FRONTEND" = true ]; then
        echo ""
        echo -e "${GREEN}Successfully pushed images to Docker Hub!${NC}"
        echo -e "${YELLOW}Images are built for linux/amd64 architecture${NC}"
    fi
else
    echo ""
    if [ "$BUILD_BACKEND" = true ] || [ "$BUILD_FRONTEND" = true ]; then
        echo -e "${YELLOW}To build and push to Docker Hub for linux/amd64, run:${NC}"
        echo "  $0 --push"
        echo ""
        echo -e "${YELLOW}Note: When using buildx for linux/amd64, you must rebuild with --push${NC}"
        echo -e "${YELLOW}Regular 'docker push' won't work for cross-platform builds.${NC}"
    fi
fi

# Check if any versions were updated
if [ "$BACKEND_VERSION_CONFLICT" = true ] || [ "$FRONTEND_VERSION_CONFLICT" = true ]; then
    echo ""
    echo -e "${YELLOW}Note: Version numbers were updated. Consider committing these changes:${NC}"
    echo "  git add -A && git commit -m 'chore: Bump version numbers for Docker release'"
fi
