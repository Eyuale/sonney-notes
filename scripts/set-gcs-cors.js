const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

async function setCors() {
    console.log('Configuring CORS for GCS bucket...');

    // 1. Load env vars manually from .env.local
    const envPath = path.join(__dirname, '..', '.env.local');
    if (!fs.existsSync(envPath)) {
        console.error('Error: .env.local file not found at', envPath);
        process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    console.log('Parsing .env.local...');

    envContent.split('\n').forEach(line => {
        // Trim and ignore comments
        let cleanLine = line.trim();
        if (!cleanLine || cleanLine.startsWith('#')) return;

        // Remove "export " if present
        if (cleanLine.startsWith('export ')) {
            cleanLine = cleanLine.substring(7).trim();
        }

        // Split by first equals sign
        const idx = cleanLine.indexOf('=');
        if (idx !== -1) {
            const key = cleanLine.substring(0, idx).trim();
            let value = cleanLine.substring(idx + 1).trim();

            // Remove quotes
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            envVars[key] = value;
        }
    });

    const foundKeys = Object.keys(envVars);
    console.log('Found keys:', foundKeys.join(', '));

    const projectId = envVars.GCP_PROJECT_ID;
    const clientEmail = envVars.GCP_CLIENT_EMAIL;
    const privateKey = envVars.GCP_PRIVATE_KEY;
    const bucketName = envVars.GCS_BUCKET_NAME;

    if (!projectId || !clientEmail || !privateKey || !bucketName) {
        console.error('Error: Missing required GCS environment variables in .env.local');
        console.log('Required: GCP_PROJECT_ID, GCP_CLIENT_EMAIL, GCP_PRIVATE_KEY, GCS_BUCKET_NAME');
        process.exit(1);
    }

    // 2. Initialize Storage
    const storage = new Storage({
        projectId,
        credentials: {
            client_email: clientEmail,
            private_key: privateKey.replace(/\\n/g, '\n'),
        }
    });

    // 3. Set CORS
    const bucket = storage.bucket(bucketName);

    const corsConfiguration = [
        {
            maxAgeSeconds: 3600,
            method: ['GET', 'PUT', 'POST', 'HEAD', 'DELETE', 'OPTIONS'],
            origin: ['http://localhost:3000', 'http://localhost:3001', '*'],
            responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'User-Agent', 'x-goog-resumable'],
        },
    ];

    try {
        await bucket.setMetadata({ cors: corsConfiguration });
        console.log(`✅ Successfully updated CORS for bucket: ${bucketName}`);
        console.log('Allowed Origins:', corsConfiguration[0].origin);
        console.log('Allowed Methods:', corsConfiguration[0].method);
    } catch (err) {
        console.error('❌ Failed to update CORS:', err.message);
        if (err.code === 403) {
            console.error('Reason: Permission denied. Ensure your service account has "Storage Admin" or "Storage Object Admin" role.');
        }
    }
}

setCors();
