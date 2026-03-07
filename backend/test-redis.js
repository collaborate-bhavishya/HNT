const { Redis } = require('ioredis');
require('dotenv').config();

async function testRedis() {
    console.log('Testing Upstash Redis connection...');
    const redisUrl = (process.env.REDIS_URL || 'redis://localhost:6379').replace(/["']/g, '');

    console.log('Connecting to:', redisUrl.replace(/:[^:@]+@/, ':***@')); // Hide password

    try {
        const redis = new Redis(redisUrl, {
            maxRetriesPerRequest: null,
            connectTimeout: 5000,
        });

        redis.on('error', (err) => {
            console.error('Redis connection error:', err.message);
            process.exit(1);
        });

        redis.on('connect', () => {
            console.log('✅ Successfully connected to Redis!');
        });

        // Test writing a value
        console.log('Testing write command...');
        await redis.set('test_key', 'Hello Upstash!');
        console.log('✅ Successfully wrote to Redis');

        // Test reading a value
        console.log('Testing read command...');
        const val = await redis.get('test_key');
        console.log('✅ Successfully read from Redis. Value:', val);

        console.log('\nUpstash is responding perfectly! Closing connection...');
        await redis.quit();
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to test Redis:', err);
        process.exit(1);
    }
}

testRedis();
