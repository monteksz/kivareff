const fs = require("fs");
const axios = require("axios");
const readline = require("readline-sync");
const crypto = require("crypto");
const chalk = require("chalk");
const { HttpsProxyAgent } = require("https-proxy-agent");

// API
const API_URL = "https://app.kivanet.com/api/user/register";

// Buat Baca Proxy Dari File
function loadProxies(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(chalk.red("File proxy.txt tidak ditemukan!"));
        process.exit(1);
    }

    return fs.readFileSync(filePath, "utf8").split("\n").map(line => line.trim()).filter(Boolean);
}

// Untuk Email Acak
function generateRandomEmail() {
    const username = Math.random().toString(36).substring(2, 12);
    return `${username}@gmail.com`;
}

// Fungsi untuk membuat password acak
function generateRandomPassword() {
    const length = Math.floor(Math.random() * 2) + 7;
    return Math.random().toString(36).slice(-length);
}

// CV dari string ke md5
function convertToMD5(text) {
    return crypto.createHash("md5").update(text).digest("hex");
}

// Untuk mencoba proxy
async function testProxy(proxyUrl) {
    try {
        const agent = new HttpsProxyAgent(proxyUrl);
        const response = await axios.get("https://httpbin.org/ip", { httpsAgent: agent, timeout: 5000 });

        if (response.status === 200) {
            console.log(chalk.green(`[SUCCESS] Proxy aktif - IP: ${response.data.origin}`));
            return agent;
        }
    } catch (error) {
        console.log(chalk.red(`[FAILED] Proxy gagal: ${proxyUrl} - ${error.message}`));
    }
    return null;
}

// Ekse Reff User
async function registerUser(agent, inviteCode) {
    const email = generateRandomEmail();
    const password = generateRandomPassword();
    const hashedPassword = convertToMD5(password);

    const payload = {
        email: email,
        password: hashedPassword,
        inviteNum: inviteCode
    };

    try {
        const response = await axios.post(API_URL, payload, { httpsAgent: agent, timeout: 10000 });

        if (response.status === 200) {
            console.log(chalk.green(`[SUCCESS] Berhasil daftar: ${email} | Password: ${password}`));
            return true;
        } else {
            console.log(chalk.red(`[FAILED] Gagal daftar: ${email} | Status: ${response.status} | Respon: ${response.data}`));
        }
    } catch (error) {
        console.log(chalk.red(`[ERROR] Gagal konek ke API: ${error.message}`));
    }
    return false;
}

// Delay
async function countdownTimer(seconds) {
    for (let i = seconds; i > 0; i--) {
        process.stdout.write(chalk.yellow(`\rDelay ${i} detik... `));
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log();
}

// Fungsi utama
async function main() {
    const proxyList = loadProxies("proxy.txt");

    if (proxyList.length === 0) {
        console.log(chalk.red("Proxy list kosong! Harap isi proxy.txt"));
        return;
    }

    const inviteCode = readline.question(chalk.yellow("Masukkan Kode Reff: "));
    const jumlahReff = parseInt(readline.question(chalk.yellow("Mau Berapa Reff: ")), 10);

    for (let i = 0; i < jumlahReff; i++) {
        console.log(chalk.yellow(`\n[Mencoba Proxy Acak - ${i + 1}/${jumlahReff}]`));

        let agent = null;
        let shuffledProxies = proxyList.sort(() => Math.random() - 0.5);

        for (let proxyUrl of shuffledProxies) {
            agent = await testProxy(proxyUrl);
            if (agent) break;
        }

        if (!agent) {
            console.log(chalk.red("[ERROR] Tidak ada proxy yang bisa digunakan."));
            break;
        }

        const success = await registerUser(agent, inviteCode);
        if (!success) {
            console.log(chalk.red("[WARNING] Gagal mendaftar, mencoba proxy lain..."));
            continue;
        }

        await countdownTimer(10);
    }
}

main();