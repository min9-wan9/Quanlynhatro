import dotenv from 'dotenv';
import path from 'path';

// Load backend/.env if present, then fallback to workspace root .env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
