# 🔒 Security Configuration

## ⚠️ **Environment Variables Required**

This project requires Supabase API keys to function. **NEVER commit real API keys to git!**

### **Setup Instructions:**

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Get your Supabase credentials:**
   - Go to your Supabase project dashboard
   - Navigate to Settings → API  
   - Copy your Project URL and Anon Key

3. **Update `.env` with real values:**
   ```env
   VITE_SUPABASE_URL=https://your-actual-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs... (your real key)
   EXPO_PUBLIC_SUPABASE_URL=https://your-actual-project.supabase.co  
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs... (your real key)
   ```

## 🛡️ **Security Notes**

### **What's Safe to Commit:**
- ✅ `.env.example` - Contains placeholder values only
- ✅ Code files with `process.env.*` references
- ✅ Documentation mentioning environment variables

### **What's NEVER Safe to Commit:**
- ❌ `.env` files with real values
- ❌ Hardcoded API keys in source code  
- ❌ Service role keys (server-side only)
- ❌ Database passwords or connection strings

### **Supabase Key Types:**

#### **Anon/Public Key** (Safe for client-side)
- Used in mobile app and web frontend
- Can be exposed in client-side code
- Row Level Security (RLS) protects data access

#### **Service Role Key** (Server-side only)
- **NEVER use in mobile app or frontend**
- Only for admin/backend operations
- Bypasses RLS - has full database access

## 🔧 **Development Workflow**

1. **First time setup:**
   ```bash
   cp .env.example .env
   # Edit .env with your real Supabase values
   ```

2. **Never commit .env:**
   - `.env` is in `.gitignore`
   - Only commit changes to `.env.example` if adding new variables

3. **Production deployment:**
   - Set environment variables in your deployment platform
   - Never include .env files in production builds

## 🚨 **If You Accidentally Commit Secrets:**

1. **Rotate the keys immediately** in Supabase dashboard
2. **Remove from git history:**
   ```bash
   git filter-branch --force --index-filter \
   'git rm --cached --ignore-unmatch .env' \
   --prune-empty --tag-name-filter cat -- --all
   ```
3. **Force push** (if repository is not shared yet)
4. **Generate new keys** in Supabase

## 📱 **Mobile App Environment Variables**

React Native/Expo apps handle environment variables differently:

- Use `EXPO_PUBLIC_*` prefix for client-side values
- Environment variables are bundled into the app at build time
- For sensitive config, consider using Expo SecureStore

## 🔍 **Verification**

Before committing, always run:
```bash
# Check for accidental secrets in staged files
git diff --cached | grep -i "eyJhbGciOi\|sk_\|pk_"

# Should return empty - if it finds anything, remove it!
```

---

**Remember: The anon key is safe to expose client-side, but treat it like a public API key - don't abuse it and monitor usage in Supabase dashboard.** 🔐