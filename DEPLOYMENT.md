# 🚀 AgriBusiness Backend Deployment Guide

## **Overview**
This guide will help you deploy your Express.js backend to Vercel, which will provide the API endpoints your frontend needs.

## **📋 Prerequisites**
- [Vercel Account](https://vercel.com/signup) (free tier available)
- [GitHub Account](https://github.com)
- Your project already pushed to GitHub

## **🔧 Step 1: Deploy Backend to Vercel**

### **1.1 Go to Vercel Dashboard**
1. Visit [vercel.com](https://vercel.com)
2. Sign in with your GitHub account
3. Click **"New Project"**

### **1.2 Import Your Repository**
1. Select **"Import Git Repository"**
2. Choose your **AgriBusiness** repository
3. Click **"Import"**

### **1.3 Configure Project Settings**
```
Project Name: agribusiness-backend
Framework Preset: Other
Root Directory: ./
Build Command: (leave empty)
Output Directory: (leave empty)
Install Command: npm install
```

### **1.4 Set Environment Variables**
Click **"Environment Variables"** and add:

#### **Firebase Configuration:**
```
FIREBASE_PROJECT_ID = trms-4f542
FIREBASE_PRIVATE_KEY = (your Firebase private key)
FIREBASE_CLIENT_EMAIL = (your Firebase client email)
```

#### **Email Configuration:**
```
EMAIL_HOST = smtp.gmail.com
EMAIL_PORT = 587
EMAIL_USER = (your email)
EMAIL_PASS = (your app password)
```

#### **Session Secret:**
```
SESSION_SECRET = (random secret string)
NODE_ENV = production
```

### **1.5 Deploy**
1. Click **"Deploy"**
2. Wait for deployment to complete
3. Copy your **Vercel URL** (e.g., `https://agribusiness-backend.vercel.app`)

## **🔧 Step 2: Update Frontend API Calls**

### **2.1 Create Environment File**
Create `client/.env.production`:
```env
VITE_API_BASE_URL=https://your-vercel-url.vercel.app
```

### **2.2 Update API Client**
Update your API client to use the Vercel URL instead of localhost.

## **🔧 Step 3: Test Deployment**

### **3.1 Test API Endpoints**
Visit your Vercel URL + `/api/admin/login` to test if the backend is working.

### **3.2 Test Admin Login**
Try logging into your admin panel at `/123456` - it should now work with the Vercel backend.

## **📱 Your URLs After Deployment**

- **Frontend:** `https://css-isac.netlify.app`
- **Admin Panel:** `https://css-isac.netlify.app/123456`
- **Backend API:** `https://your-project.vercel.app`

## **🚨 Troubleshooting**

### **Common Issues:**
1. **Build Failures:** Check Vercel logs for missing dependencies
2. **Environment Variables:** Ensure all required variables are set
3. **Firebase Issues:** Verify Firebase credentials are correct
4. **CORS Issues:** Vercel handles CORS automatically

### **Need Help?**
- Check Vercel deployment logs
- Verify environment variables
- Test API endpoints directly

## **✅ Success Indicators**
- ✅ Backend deploys without errors
- ✅ API endpoints return 200 responses
- ✅ Admin login works at `/123456`
- ✅ No more 404 errors for `/api/admin/login`

---

**Next Steps:** After deployment, your admin panel will work perfectly with the Vercel backend!
