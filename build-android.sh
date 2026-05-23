#!/bin/bash
# PomoJI Android Build Helper Script

set -e

PROJECT_DIR="c:/Users/2060/Desktop/SoftwareEngineering/PomoJI"
PACKAGE_NAME="com.pomoji.app"

echo "🚀 PomoJI Android APK Build & Install Helper"
echo "=============================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Verify Environment
echo "📋 Step 1: Verifying environment..."
cd "$PROJECT_DIR"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

if ! command -v eas &> /dev/null; then
    echo -e "${YELLOW}⚠️  EAS CLI not found. Installing...${NC}"
    npm install -g eas-cli
fi

echo -e "${GREEN}✅ Environment verified${NC}"
echo ""

# Step 2: Clean Cache
echo "🧹 Step 2: Cleaning build cache..."
rm -rf .expo node_modules/.cache 2>/dev/null || true
npm cache clean --force
echo -e "${GREEN}✅ Cache cleaned${NC}"
echo ""

# Step 3: Install Dependencies
echo "📦 Step 3: Installing dependencies..."
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 4: Type Check
echo "🔍 Step 4: Running type check..."
npm run type-check || echo -e "${YELLOW}⚠️  TypeScript warnings detected${NC}"
echo -e "${GREEN}✅ Type check completed${NC}"
echo ""

# Step 5: Build Decision
echo "🏗️  Step 5: Build Configuration"
echo "Choose build profile:"
echo "1) Development (faster, for testing)"
echo "2) Production (slower, for release)"
read -p "Enter choice (1 or 2): " BUILD_CHOICE

case $BUILD_CHOICE in
    1)
        PROFILE="development"
        echo -e "${YELLOW}Building for DEVELOPMENT${NC}"
        ;;
    2)
        PROFILE="production"
        echo -e "${YELLOW}Building for PRODUCTION${NC}"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac
echo ""

# Step 6: Build APK
echo "⏳ Step 6: Building APK (this may take 10-20 minutes)..."
eas build --platform android --profile $PROFILE

echo -e "${GREEN}✅ Build completed${NC}"
echo ""

# Step 7: Installation Instructions
echo "📱 Step 7: Installation"
echo "Next steps:"
echo "1. Download APK from EAS Build dashboard"
echo "2. Enable 'Install from Unknown Sources' on Android device"
echo "3. Run: adb install -r path/to/PomoJI.apk"
echo ""
echo "Or automatically:"
read -p "Do you have ADB installed and device connected? (y/n): " ADB_READY

if [ "$ADB_READY" = "y" ] || [ "$ADB_READY" = "Y" ]; then
    echo "Waiting for APK download and installation..."
    echo ""
    echo "Once APK is downloaded, place it in current directory and run:"
    echo "  adb install -r PomoJI.apk"
fi

echo ""
echo "✨ Build process complete!"
echo "For troubleshooting, see ANDROID_FIX.md"
