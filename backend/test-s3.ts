import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

async function testS3() {
    console.log("Testing S3 Configuration...");
    const client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
        }
    });

    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
        console.error("AWS_S3_BUCKET_NAME is not set");
        return;
    }

    const testKey = `test-upload-${Date.now()}.txt`;
    const testContent = "Hello from BrightChamps S3 Test!";

    try {
        console.log(`Uploading to bucket: ${bucketName}, key: ${testKey}`);
        const putCmd = new PutObjectCommand({
            Bucket: bucketName,
            Key: testKey,
            Body: testContent,
            ContentType: 'text/plain'
        });
        await client.send(putCmd);
        console.log("✅ Upload Successful!");

        const fetchUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${testKey}`;
        console.log(`✅ URL Generated: ${fetchUrl}`);
        
        console.log("You can try fetching the URL to verify public access...");
    } catch (e) {
        console.error("❌ S3 Test Failed:", e);
    }
}

testS3();
