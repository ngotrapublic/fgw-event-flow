import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envContent = `VITE_FIREBASE_API_KEY=AIzaSyC8c6gAWIXiuoE6tDMtwvjSiv1rPGgS0yM
VITE_FIREBASE_AUTH_DOMAIN=fgw-event-mangager.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=fgw-event-mangager
VITE_FIREBASE_STORAGE_BUCKET=fgw-event-mangager.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=232110410564
VITE_FIREBASE_APP_ID=1:232110410564:web:bcffaaf81a77b0045b2511`;

const filePath = path.join(__dirname, '.env');

try {
    fs.writeFileSync(filePath, envContent, { encoding: 'utf8' });
    console.log('✅ .env file created successfully at:', filePath);
} catch (error) {
    console.error('❌ Error creating .env file:', error);
}
