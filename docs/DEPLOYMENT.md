# Deployment Guide

## Overview

The D&D Encounter Manager is a static single-page application (SPA) built with Vite that can be deployed to any static hosting service. This guide covers various deployment options and best practices.

## Quick Deployment

### 1. Build the Application

```bash
# Install dependencies
npm install

# Create production build
npm run build
```

This creates a `dist/` folder containing all the optimized static files ready for deployment.

### 2. Deploy to Static Hosting

Upload the contents of the `dist/` folder to your hosting service. The application will run entirely in the browser with no server-side requirements.

## Hosting Platforms

### Netlify (Recommended)

**Manual Deployment:**
1. Build the application: `npm run build`
2. Visit [Netlify](https://netlify.com)
3. Drag and drop the `dist/` folder onto the deploy area

**Continuous Deployment:**
1. Connect your Git repository to Netlify
2. Set build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. Deploy automatically on every push

**netlify.toml Configuration:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

**Benefits:**
- Free tier available
- Automatic HTTPS
- Global CDN
- Form handling (for future features)
- Deploy previews for pull requests

### Vercel

**Manual Deployment:**
1. Install Vercel CLI: `npm i -g vercel`
2. Build and deploy: `npm run build && vercel --prod`

**Continuous Deployment:**
1. Import repository on [Vercel](https://vercel.com)
2. Configure settings:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

**vercel.json Configuration:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Benefits:**
- Excellent performance
- Edge network
- Zero configuration
- Preview deployments

### GitHub Pages

**Setup:**
1. Enable GitHub Pages in repository settings
2. Choose "GitHub Actions" as source

**GitHub Actions Workflow (`.github/workflows/deploy.yml`):**
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build application
      run: npm run build

    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

**Custom Domain (Optional):**
1. Add `CNAME` file to `public/` folder with your domain
2. Configure DNS records with your domain provider

**Benefits:**
- Free hosting
- Integrates with GitHub workflow
- Custom domain support

### AWS S3 + CloudFront

**S3 Setup:**
1. Create S3 bucket
2. Enable static website hosting
3. Upload `dist/` contents
4. Configure bucket policy for public access

**Bucket Policy Example:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

**CloudFront Setup:**
1. Create CloudFront distribution
2. Set S3 bucket as origin
3. Configure error pages to redirect to `index.html`

**Benefits:**
- Highly scalable
- Global CDN
- SSL/TLS certificates
- Fine-grained control

### DigitalOcean App Platform

**app.yaml Configuration:**
```yaml
name: dnd-encounter-manager
static_sites:
- name: web
  source_dir: dist
  github:
    repo: your-username/dnd-encounter-manager
    branch: main
  build_command: npm run build
  catchall_document: index.html
```

**Benefits:**
- Simple deployment
- Automatic builds
- SSL certificates included

## Environment-Specific Builds

### Production Build

```bash
NODE_ENV=production npm run build
```

**Optimizations:**
- JavaScript minification
- CSS optimization
- Tree shaking (removes unused code)
- Asset compression
- Bundle splitting

### Development Preview

```bash
npm run build
npm run preview
```

Test the production build locally before deployment.

### Build Configuration

**Vite Configuration (`vite.config.js`):**
```javascript
export default defineConfig({
  base: './', // Use relative paths for deployment flexibility

  build: {
    outDir: 'dist',
    sourcemap: false, // Disable in production
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'], // If using frameworks
        }
      }
    }
  },

  // Optimize assets
  assetsInclude: ['**/*.woff', '**/*.woff2']
});
```

## Domain Configuration

### Custom Domain Setup

**DNS Configuration:**
```
Type: CNAME
Name: www
Value: your-hosting-provider.com

Type: A (or CNAME)
Name: @
Value: hosting-provider-ip (or alias)
```

**SSL/HTTPS:**
Most hosting providers offer free SSL certificates via Let's Encrypt. Ensure HTTPS is enabled for:
- Security
- Service worker support (future features)
- Better SEO rankings

### Subdomain Deployment

For staging/development environments:
```
staging.yourdomain.com → staging deployment
dev.yourdomain.com → development deployment
yourdomain.com → production deployment
```

## Performance Optimization

### Build Optimizations

**Bundle Analysis:**
```bash
# Analyze bundle size
npm run build -- --analyze
```

**Code Splitting:**
```javascript
// Lazy load large components
const HeavyComponent = lazy(() => import('./HeavyComponent.js'));
```

**Asset Optimization:**
- Compress images before adding to project
- Use WebP format for better compression
- Minimize font files

### CDN Configuration

**Cache Headers:**
```
# Static assets (CSS, JS, images)
Cache-Control: public, max-age=31536000, immutable

# HTML files
Cache-Control: public, max-age=0, must-revalidate
```

**Compression:**
Enable gzip/brotli compression on your hosting platform for better load times.

## Monitoring and Analytics

### Performance Monitoring

**Web Vitals:**
Add performance monitoring to track:
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)

**Implementation:**
```javascript
// In main.js or separate analytics file
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics provider
  console.log(metric);
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### Error Tracking

**Basic Error Logging:**
```javascript
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Send to error tracking service
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Send to error tracking service
});
```

### Usage Analytics

Consider adding privacy-respecting analytics:
- **Plausible Analytics** (privacy-focused)
- **Google Analytics 4** (with proper consent)
- **Simple Analytics** (minimal tracking)

## Security Considerations

### Content Security Policy (CSP)

**HTTP Header:**
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;
```

**Meta Tag Alternative:**
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
```

### Security Headers

**Recommended Headers:**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### Data Protection

**localStorage Security:**
- No sensitive data stored
- Regular cleanup of old data
- Data validation on retrieval

## Backup and Recovery

### Data Export Feature

The application includes data export functionality:
```javascript
// Export all user data
const backup = await DataServices.exportAllData();
const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
// Download or store backup
```

### Disaster Recovery

**Backup Strategy:**
1. Regular automated backups of hosting platform
2. Version control for code changes
3. Database backups (if backend added in future)

**Recovery Plan:**
1. Redeploy from Git repository
2. Restore from hosting platform backup
3. Import user data from exported backups

## Scaling Considerations

### Traffic Growth

**Current Architecture:**
- Static hosting scales automatically
- No server-side bottlenecks
- CDN handles global distribution

**Future Scaling Options:**
- Add service worker for offline functionality
- Implement progressive web app (PWA) features
- Consider server-side features for advanced functionality

### Feature Scaling

**Adding Server-Side Features:**
If future features require a backend:
1. **API Deployment:** Separate API service (Node.js, Python, etc.)
2. **Database:** For shared encounters, user accounts
3. **Authentication:** For user management
4. **Real-time Features:** WebSocket support for multiplayer

## Deployment Checklist

### Pre-Deployment

- [ ] Code review completed
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Documentation updated

### Build Process

- [ ] Clean build successful: `rm -rf dist && npm run build`
- [ ] Bundle size acceptable
- [ ] No console errors in production build
- [ ] Local preview works: `npm run preview`

### Deployment

- [ ] Files uploaded to hosting platform
- [ ] DNS configured correctly
- [ ] SSL certificate active
- [ ] Custom domain working (if applicable)
- [ ] Redirects working properly

### Post-Deployment

- [ ] Application loads successfully
- [ ] All features working as expected
- [ ] Performance metrics within acceptable ranges
- [ ] Error monitoring active
- [ ] Analytics tracking (if implemented)

### Rollback Plan

- [ ] Previous version backup available
- [ ] Rollback procedure documented
- [ ] DNS changes can be reverted
- [ ] Team notified of deployment status

## Troubleshooting Deployment Issues

### Common Build Issues

**Module Not Found:**
```bash
# Clear dependencies and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Out of Memory:**
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

**Import Path Issues:**
```javascript
// Use absolute imports from src root
import { CombatantService } from '/scripts/services/combatant-service.js';
```

### Hosting Platform Issues

**404 Errors on Refresh:**
- Configure hosting platform to serve `index.html` for all routes
- Add redirect rules (see platform-specific configurations above)

**Assets Not Loading:**
- Check base path configuration in `vite.config.js`
- Verify asset paths are relative or absolute correctly
- Ensure assets are included in build output

**HTTPS Issues:**
- Force HTTPS redirects on hosting platform
- Update any hardcoded HTTP links to HTTPS
- Check mixed content warnings in browser console

### Performance Issues

**Slow Loading:**
- Enable compression (gzip/brotli)
- Optimize images and assets
- Implement code splitting
- Use CDN for asset delivery

**Large Bundle Size:**
- Analyze bundle with build tools
- Remove unused dependencies
- Implement lazy loading for large components

## Maintenance

### Regular Tasks

**Weekly:**
- [ ] Check deployment status
- [ ] Review error logs
- [ ] Monitor performance metrics

**Monthly:**
- [ ] Update dependencies: `npm audit && npm update`
- [ ] Review and clean old deployments
- [ ] Check SSL certificate expiration

**Quarterly:**
- [ ] Full security audit
- [ ] Performance optimization review
- [ ] Backup and recovery testing

### Version Management

**Semantic Versioning:**
- **Major:** Breaking changes (2.0.0)
- **Minor:** New features (1.1.0)
- **Patch:** Bug fixes (1.0.1)

**Release Process:**
1. Update version in `package.json`
2. Create release notes
3. Tag release in Git
4. Deploy to production
5. Monitor for issues

Happy deploying! 🚀