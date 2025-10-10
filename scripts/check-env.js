const required = ['MONGO_URL','DB_NAME','JWT_SECRET','NEXT_PUBLIC_BASE_URL'];
const missing = required.filter(k=>!process.env[k]);
if (missing.length) { console.error('MISSING_ENV', missing.join(',')); process.exit(2); }
console.log('OK');