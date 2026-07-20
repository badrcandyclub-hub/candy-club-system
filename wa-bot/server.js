const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// Bot State
let botStatus = 'INITIALIZING'; // INITIALIZING, QR_READY, AUTHENTICATED, READY, SENDING, PAUSED
let qrCodeData = null;
let currentCampaign = {
    total: 0,
    sent: 0,
    failed: 0,
    isPaused: false,
    pauseTimeLeft: 0,
    nextMessageIn: 0
};

console.log('🚀 Starting Candy Club WhatsApp Bot...');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    botStatus = 'QR_READY';
    qrCodeData = qr;
    console.log('\n=============================================');
    console.log('📱 PLEASE SCAN THIS QR CODE WITH YOUR WHATSAPP');
    console.log('=============================================\n');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    botStatus = 'READY';
    console.log('\n✅ WhatsApp Bot is Ready and Connected!');
});

client.on('authenticated', () => {
    botStatus = 'AUTHENTICATED';
    console.log('🔒 Authenticated successfully.');
});

client.on('auth_failure', msg => {
    console.error('❌ Authentication failed:', msg);
    botStatus = 'AUTH_ERROR';
});

client.on('disconnected', (reason) => {
    console.log('❌ Client was logged out or disconnected', reason);
    botStatus = 'DISCONNECTED';
});

client.initialize();

// Helper for delays
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Random integer between min and max
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

app.get('/status', (req, res) => {
    res.json({
        status: botStatus,
        qr: botStatus === 'QR_READY' ? qrCodeData : null,
        campaign: currentCampaign
    });
});

app.post('/start-campaign', async (req, res) => {
    if (botStatus !== 'READY' && botStatus !== 'SENDING') {
        return res.status(400).json({ error: 'Bot is not ready. Status: ' + botStatus });
    }
    
    if (botStatus === 'SENDING') {
        return res.status(400).json({ error: 'A campaign is already running.' });
    }

    const { customers, messageTemplate } = req.body;
    
    if (!customers || !Array.isArray(customers) || customers.length === 0) {
        return res.status(400).json({ error: 'No customers provided.' });
    }

    botStatus = 'SENDING';
    currentCampaign = {
        total: customers.length,
        sent: 0,
        failed: 0,
        isPaused: false,
        pauseTimeLeft: 0,
        nextMessageIn: 0
    };

    res.json({ message: 'Campaign started successfully!', total: customers.length });

    console.log(`\n🚀 Starting campaign for ${customers.length} customers...`);

    let successCountInBatch = 0;

    for (let i = 0; i < customers.length; i++) {
        const customer = customers[i];
        
        // 1. Prepare Phone Number
        let phone = customer.phone.toString().replace(/\D/g, "");
        if (phone.startsWith("0")) phone = "2" + phone;
        else if (!phone.startsWith("20") && phone.length === 10) phone = "20" + phone;
        
        const chatId = phone + "@c.us";
        
        // 2. Prepare Message
        const messageText = messageTemplate.replace(/\[الاسم\]/g, customer.name);

        try {
            await client.sendMessage(chatId, messageText);
            currentCampaign.sent++;
            successCountInBatch++;
            console.log(`✅ [${currentCampaign.sent}/${currentCampaign.total}] Sent to: ${customer.name} (${phone})`);
        } catch (err) {
            console.error(`❌ Failed to send to ${customer.name} (${phone}):`, err.message);
            currentCampaign.failed++;
        }

        // 3. Anti-Ban Logic
        if (i < customers.length - 1) { // If not the last message
            if (successCountInBatch >= 50) {
                // Pause for 15 minutes after 50 messages
                console.log('\n⏸️ Anti-Ban: 50 messages sent. Pausing for 15 minutes...');
                currentCampaign.isPaused = true;
                currentCampaign.pauseTimeLeft = 15 * 60; // 15 minutes in seconds
                
                while(currentCampaign.pauseTimeLeft > 0) {
                    await sleep(1000);
                    currentCampaign.pauseTimeLeft--;
                }
                
                currentCampaign.isPaused = false;
                successCountInBatch = 0;
                console.log('▶️ Resuming campaign...\n');
            } else {
                // Random delay between 45s and 90s
                const delaySeconds = getRandomInt(45, 90);
                console.log(`⏳ Anti-Ban: Waiting ${delaySeconds} seconds before next message...`);
                
                currentCampaign.nextMessageIn = delaySeconds;
                while(currentCampaign.nextMessageIn > 0) {
                    await sleep(1000);
                    currentCampaign.nextMessageIn--;
                }
            }
        }
    }

    console.log('\n🎉 Campaign Finished!');
    botStatus = 'READY';
});

app.listen(PORT, () => {
    console.log(`🌐 API Server running on http://localhost:${PORT}`);
});
