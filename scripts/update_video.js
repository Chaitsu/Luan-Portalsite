// scripts/update_video.js
const fs = require('fs');
const path = require('path');

// ▼▼▼ チャンネルID ▼▼▼
const CHANNEL_ID = 'UC__HgxNLA3yR6FE9H-kvXYQ'; 
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const DATA_PATH = path.join(__dirname, '../stories/data.json');

async function main() {
    console.log(`Fetching RSS feed for ${CHANNEL_ID}...`);

    // 1. RSSフィード(XML)を取得
    const res = await fetch(RSS_URL);
    if (!res.ok) throw new Error(`Failed to fetch RSS: ${res.statusText}`);
    const xmlText = await res.text();

    // 2. 正規表現で最新の <entry> ブロックを抽出 (XMLパーサー不要)
    // ※最初の <entry> が最新動画です
    const entryMatch = xmlText.match(/<entry>([\s\S]*?)<\/entry>/);
    if (!entryMatch) {
        console.log("No videos found in RSS feed.");
        return;
    }
    const entry = entryMatch[1];

    // 3. 必要な情報を抽出
    const videoIdMatch = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
    const titleMatch = entry.match(/<title>(.*?)<\/title>/);
    const publishedMatch = entry.match(/<published>(.*?)<\/published>/);
    // 概要欄はRSSには含まれないことが多い、または短いので固定文言にするか、media:descriptionを探す
    const summaryMatch = entry.match(/<media:description[\s\S]*?>([\s\S]*?)<\/media:description>/);

    if (!videoIdMatch || !titleMatch) {
        throw new Error("Failed to parse video details.");
    }

    const videoId = videoIdMatch[1];
    const title = titleMatch[1];
    const published = publishedMatch ? publishedMatch[1].split('T')[0] : new Date().toISOString().split('T')[0];
    const summary = summaryMatch ? summaryMatch[1].slice(0, 80) + "..." : "最新の動画をチェック！";

    // サムネイルは高画質版をURL生成で確保
    const thumb = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

    const newLatest = {
        title: title,
        summary: summary,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        videoId: videoId,
        thumb: thumb,
        publishedAt: published
    };

    // 4. data.json を更新
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

    // channel.latestが存在しない場合のガード
    if (!data.channel) data.channel = {};
    if (!data.channel.latest) data.channel.latest = {};

    if (data.channel.latest.videoId === newLatest.videoId) {
        console.log("No new updates.");
    } else {
        data.channel.latest = newLatest;
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
        console.log("data.json updated with:", newLatest.title);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});