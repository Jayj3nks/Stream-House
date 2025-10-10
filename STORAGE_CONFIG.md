# Storage Configuration

The application supports multiple storage providers with automatic fallback:

## Storage Priority (in order)
1. **AWS S3** - Primary storage (production)
2. **Cloudinary** - Fallback storage 
3. **Mock Storage** - Development/testing

## Configuration

### AWS S3 (Primary)
Set these environment variables:
```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
```

### Cloudinary (Fallback)
Set these environment variables:
```bash
# Option 1: Using CLOUDINARY_URL
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# Option 2: Individual variables
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Mock Storage (Development)
No configuration needed. Used automatically when no other providers are configured.

## How it works

The `StorageAdapter` class automatically detects available credentials and chooses the appropriate provider:

- If AWS credentials are available → Uses AWS S3
- If no AWS but Cloudinary is configured → Uses Cloudinary
- If neither is configured → Falls back to Mock Storage

This allows seamless deployment across different environments without code changes.