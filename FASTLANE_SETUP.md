# 🚀 Fastlane Setup Guide

## Overview

Fastlane automates iOS builds, certificate management, and App Store deployment for the Salesperson Tracker mobile app. This setup includes automated certificate management via Match and streamlined deployment to TestFlight and App Store.

## 🔧 **Prerequisites**

### **1. Apple Developer Account**
- Active Apple Developer Program membership
- Access to App Store Connect with App Manager role or higher
- Team ID: `DAV93N6F9B` (configured)
- Apple ID: `steve@stevebargelt.com` (configured)

### **2. Git Repository for Certificates**
Create a **private** repository for Match certificate storage:
```bash
# Create private repo (replace with your GitHub username)
gh repo create salesperson-tracking-certificates --private --description "Certificate and provisioning profile storage for Fastlane Match"
```

### **3. App Store Connect API Key**
1. Go to App Store Connect → Users and Access → Integrations → App Store Connect API
2. Create new API key with "Developer" role
3. Download the `.p8` file and note the Key ID and Issuer ID

## 📱 **Available Commands**

All commands can be run from the workspace root using Nx:

### **Certificate Management:**
```bash
# Set up and sync certificates (run once per developer machine)
npx nx fastlane-certificates mobile

# This creates/updates:
# - Development certificates for local testing
# - App Store distribution certificates
# - Provisioning profiles with background location entitlements
```

### **Build Commands:**
```bash
# Development build (Debug configuration)
npx nx build-development mobile

# Staging build (Release configuration, AdHoc distribution)
npx nx build-staging mobile

# Production build (Release configuration, App Store distribution)
npx nx build-production mobile
```

### **Deployment Commands:**
```bash
# Deploy to TestFlight for beta testing
npx nx deploy-beta mobile

# Deploy to App Store (manual review submission)
npx nx deploy-production mobile
```

## 🔐 **Certificate Setup (Match)**

### **Initial Setup (Run Once):**

1. **Create certificate repository:**
   ```bash
   # Update Matchfile with your repository URL
   # Edit apps/mobile/ios/fastlane/Matchfile
   git_url("git@github.com:yourusername/salesperson-tracking-certificates.git")
   ```

2. **Initialize Match:**
   ```bash
   cd apps/mobile/ios
   bundle exec fastlane match init
   ```

3. **Create certificates:**
   ```bash
   # Create development certificates
   bundle exec fastlane match development
   
   # Create App Store certificates
   bundle exec fastlane match appstore
   ```

### **Team Member Setup:**
New team members just need to run:
```bash
npx nx fastlane-certificates mobile
```

This automatically downloads and installs the shared certificates.

## 🎯 **Background Location Entitlements**

The Fastlane setup automatically handles the special requirements for background location tracking:

### **Custom Entitlements** (`ios/fastlane/entitlements.plist`)
- `com.apple.developer.location.background`
- `com.apple.developer.location.continuous`  
- Background modes for location processing

### **Provisioning Profiles**
Match automatically creates provisioning profiles with these capabilities included.

## 🧪 **Testing & Distribution**

### **TestFlight Beta Testing:**

1. **Add Internal Testers:**
   - Go to App Store Connect → TestFlight
   - Add email addresses of team members
   - Create "Internal Testers" group

2. **Deploy Beta:**
   ```bash
   npx nx deploy-beta mobile
   ```

3. **Beta Access:**
   - Testers receive email invitation
   - Install TestFlight app on device
   - Download beta build for field testing

### **Production Release:**

1. **Trigger Production Build:**
   ```bash
   # Include [release] in commit message to trigger automatic deployment
   git commit -m "feat: new location tracking features [release]"
   git push origin main
   ```

2. **Manual App Store Submission:**
   - Review build in App Store Connect
   - Submit for App Store review manually
   - Monitor review status

## 🔄 **CI/CD Pipeline**

### **Automated Workflows:**

**Pull Requests:**
- TypeScript checking
- Linting (warnings allowed)
- Development build creation
- Build artifact upload

**Develop Branch:**
- Full testing suite
- Staging build
- Automatic TestFlight deployment

**Main Branch (with [release]):**
- Production build
- App Store Connect upload
- Git tag creation

### **Required GitHub Secrets:**

Add these secrets in GitHub → Settings → Secrets:

```bash
# Certificate encryption password
MATCH_PASSWORD=your-match-encryption-password

# App Store Connect API Key (JSON format)
APP_STORE_CONNECT_API_KEY='{
  "key_id": "YOUR_KEY_ID",
  "issuer_id": "YOUR_ISSUER_ID", 
  "key": "-----BEGIN PRIVATE KEY-----\nYOUR_P8_KEY_CONTENT\n-----END PRIVATE KEY-----"
}'

# Fastlane session for 2FA (optional)
FASTLANE_SESSION=your-fastlane-session-token

# Slack notifications (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

## 📊 **Build Outputs**

### **Build Artifacts:**
```
apps/mobile/ios/builds/
├── development/
│   └── SalespersonTracker-Dev.ipa
├── staging/
│   └── SalespersonTracker-Staging.ipa
└── production/
    └── SalespersonTracker-Production.ipa
```

### **Build Information:**
- **Development**: Debug symbols, development certificates
- **Staging**: Optimized build, AdHoc distribution for internal testing
- **Production**: App Store optimized, distribution certificates

## 🚨 **Important Notes**

### **Background Location Requirements:**
- **Physical device testing required** - Background location doesn't work in simulator
- **Always permission needed** - Users must grant "Always" location access
- **Entitlements validation** - Match ensures proper provisioning profiles

### **Certificate Management:**
- **Private repository** required for Match certificate storage
- **Encryption password** needed for certificate decryption
- **Team sharing** - All developers use same certificates via Match

### **First Time Setup:**
1. Create private certificate repository
2. Initialize Match with development and App Store certificates
3. Configure GitHub secrets
4. Test build locally before committing

## 🔍 **Troubleshooting**

### **Common Issues:**

#### **Certificate Problems:**
```bash
# Clear and regenerate certificates
cd apps/mobile/ios
bundle exec fastlane match nuke development
bundle exec fastlane match nuke distribution
bundle exec fastlane certificates
```

#### **Build Failures:**
```bash
# Clean and rebuild
rm -rf builds/
bundle exec fastlane build_development
```

#### **TestFlight Upload Issues:**
- Verify App Store Connect API key permissions
- Check build configuration matches provisioning profile
- Ensure background location entitlements are properly configured

### **Local Testing:**
```bash
# Test certificate setup
npx nx fastlane-certificates mobile

# Test development build  
npx nx build-development mobile

# Test staging build (closer to production)
npx nx build-staging mobile
```

## 📈 **Benefits**

### **For Developers:**
- **One command builds** for any environment
- **Automatic certificate management** - no manual cert/profile handling
- **Consistent builds** across team members
- **Integrated with Nx** - works from any directory

### **For Distribution:**
- **Professional TestFlight** distribution for field sales team
- **Automated App Store** preparation and submission
- **Build versioning** and changelog generation
- **Team notifications** via Slack integration

### **For Production:**
- **Enterprise-grade** certificate management
- **Automated compliance** with Apple requirements
- **Streamlined releases** with proper versioning
- **Audit trail** through git tags and build logs

---

**🎯 This Fastlane setup provides professional iOS app distribution specifically designed for the salesperson tracking app's background location requirements and field testing needs.**