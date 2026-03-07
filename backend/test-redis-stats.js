const { Redis } = require('ioredis');
require('dotenv').config();

async function checkCommands() {
    console.log('Fetching Redis Stats from Upstash...');
    const url = (process.env.REDIS_URL || 'redis://localhost:6379').replace(/["']/g, '');

    try {
        const redis = new Redis(url, { maxRetriesPerRequest: null });

        // This command returns statistics about every single Redis command called
        const info = await redis.info('commandstats');

        console.log('\n--- Real-Time Command Stats ---');
        let totalCommands = 0;

        const lines = info.split('\r\n');
        for (const line of lines) {
            if (line.startsWith('cmdstat_')) {
                const commandName = line.split(':')[0].replace('cmdstat_', '');
                const callsMatch = line.match(/calls=([0-9]+)/);
                if (callsMatch && callsMatch[1]) {
                    const calls = parseInt(callsMatch[1], 10);
                    totalCommands += calls;
                    console.log(`- ${commandName.toUpperCase()}: ${calls} calls`);
                }
            }
        }

        console.log('\n=============================');
        console.log(`TOTAL COMMANDS ISSUED: ${totalCommands}`);
        console.log('=============================');

        await redis.quit();
        process.exit(0);
    } catch (err) {
        console.error('Failed to connect:', err);
        process.exit(1);
    }
}

checkCommands();
