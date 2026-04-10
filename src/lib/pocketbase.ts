import PocketBase from 'pocketbase';

// Replace with your actual PocketHost URL
const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'https://coffee-pos.pockethost.io');

export default pb;
