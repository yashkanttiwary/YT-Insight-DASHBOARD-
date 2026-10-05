import * as XLSX from "xlsx";
import { IDVideoItem } from "../types";

export const SAMPLE_ID_DATA_RAW = `Content Team	18-Sep	September	Main Channel	Vivek		In-House Editor	https://www.playbook.com/s/demat/xAH4j1s9ybfxh3rABkTCLxCg?assetToken=9DwkeR5ArnSffz8wmFGAMRV4	Education Loan Against Property	loan-against-property	loans	borrowers							https://youtu.be/FuSnM_QwBkU
Content Team	18-Sep	September	Main Channel	Vivek		In-House Editor	https://www.playbook.com/s/demat/zz37Ky7nGZmYZyZyS3JBnuDR?assetToken=imgDgrT7C7vz8ECzWRenLXh9	Commercial Property Loan Interest Rates (June 2026)	loan-against-property	loans	borrowers							https://youtu.be/RsBy6EHHU2Q
Content Team	18-Sep	September	Main Channel	Vivek		In-House Editor	https://www.playbook.com/s/demat/jhdRtNBBMbrYvqw9xhWs8632?assetToken=MLQuoeMGmSFbYW1bE7znBTwt	Types of Fixed Deposit: Features, Options & Comparison	fixed-deposit	investments	savers							https://youtu.be/q3kzyfsuC8Q
Content Team	18-Sep	September	Main Channel	Vivek		In-House Editor	https://www.playbook.com/s/demat/gb287y8c9mfoGcKidjWjJ8rB?assetToken=ovz75Ma29To8mc3qNk3b9JzY	EPF Account Services: Withdrawal, Nominee & Balance Check Online	fixed-deposit	investments	savers							https://youtu.be/YJAiuw7BZbs
Content Team	18-Sep	September	Main Channel	Vivek		In-House Editor	https://www.playbook.com/s/demat/ymLWFBVJSDX5pPbK75bEPT98?assetToken=f5p48fhSCQcGkwJyPajgXCJJ	PPF Account Guide: Interest Rate, Investment Limit & Tips	fixed-deposit	investments	savers							https://youtu.be/HgzQCZu_rOc
Content Team	18-Sep	September	Main Channel	Vivek		In-House Editor	https://www.playbook.com/s/demat/vxXzFgpy1UtES64VRgcwepCB?assetToken=RjSdCLcopifagzfQGySawjqa	Loan App in India	fixed-deposit	investments	savers							https://youtu.be/4RSQUeY_jA8
Content Team	24-Sep	September	Main Channel	Vivek		In-House Editor	https://www.playbook.com/s/demat/4buZeALQPv1yK8qDvojUdvqn?assetToken=JKPqWTNhVWB43CY41gyNFwb7	3 in 1 Demat Account	demat	investments	savers							https://youtu.be/SbqbwCIEXIU
Content Team	24-Sep	September	Main Channel	Vivek		In-House Editor	https://www.playbook.com/s/demat/3r6UzVpyoNaBst5DYsjUEMcd?assetToken=1sJwVXXksJoJ2U5883EHYVSj	Perpetual Futures	demat	investments	savers							https://youtu.be/_PxtqFzopQY
Content Team	24-Sep	September	Main Channel	Vivek		In-House Editor	https://www.playbook.com/s/demat/FdZ5EipT8wNctZn6hiXTDReW?assetToken=XTW9qfVnWRaMmCn3hpGDpzDP	Commodity Futures	demat	investments	savers							https://youtu.be/tttdLuEHJok
Content Team	24-Sep	September	Main Channel	Vivek		In-House Editor	https://www.playbook.com/s/demat/zKPqc11HHMsN5H7MnwWzordR?assetToken=ipLQhVRf4FaCYtpothNFAVJY	Bearish Options Strategies	demat	investments	savers							https://youtu.be/tL8xNT8VyHQ
Content Team	24-Sep	September	Main Channel	Vivek		In-House Editor	https://www.playbook.com/s/demat/BSiLc5q4Sd4q6Kse8H9VFP7v?assetToken=xXUipBAFwU5JTe725PBCHvqL	Basics of Investment	demat	investments	savers							https://youtu.be/yZA6KulnvWg
Content Team	24-Sep	September	Main Channel	Vivek		In-House Editor	https://www.playbook.com/s/demat/oERnudg5TRxU1AeQZbbUH2KG?assetToken=K1iTxH6TiCTFpNNhQRA1hRZk	Health Insurance in your city	health-insurance	insurance	savers							https://youtu.be/Q7ictzsS9h0
Content Team	24-Sep	September	Electronics	Sanju Ghosh		In-House Editor	https://www.playbook.com/s/demat/LFRuKWK8kJ4FJtrH4iyNLg3i?assetToken=uh85Ny6TyjnERY5QFhjMyhks	Feel the Deep Pulse of the Clapbox	cd-horizontal	cd	shoppers							https://youtu.be/K1xKWAF1xbg
Content Team	24-Sep	September	Electronics	Sanju Ghosh		In-House Editor	https://www.playbook.com/s/demat/nM9MHACgs25J1Aj63iY5cXCn?assetToken=8SqXPAdbiYn1vR8FZhSocbG5	Capture every whisper with Earthworks microphones	MICROPHONE	remi	shoppers							https://youtu.be/euNajiHeu2I
Content Team	24-Sep	September	Electronics	Sanju Ghosh		In-House Editor	https://www.playbook.com/s/demat/wH9in2kDfCbfEqt1QYc9hcvD?assetToken=REtUroYhFtGiM6FZkwhD5fRv	Own the gritty streets with SOL helmets	HELMETS	remi	shoppers							https://youtu.be/9xLIl6oCK94`;

export function formatLabel(str?: string): string {
  if (!str) return "-";
  const cleaned = str.trim();
  if (!cleaned) return "-";
  return cleaned
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const YT_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
const PLAYBOOK_REGEX = /https?:\/\/(?:www\.)?playbook\.com\/[^\s\t,]+/i;

export function extractYouTubeId(urlOrText: string): string | null {
  if (!urlOrText) return null;
  const match = urlOrText.match(YT_REGEX);
  return match ? match[1] : null;
}

export function parseIDVideoText(rawText: string): IDVideoItem[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/);
  const items: IDVideoItem[] = [];
  const seenIds = new Set<string>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Check if line contains a YouTube link
    const ytMatch = line.match(YT_REGEX);
    if (!ytMatch) continue;

    const videoId = ytMatch[1];
    const fullYtUrl = ytMatch[0].startsWith("http") ? ytMatch[0] : `https://${ytMatch[0]}`;

    if (seenIds.has(videoId)) continue;
    seenIds.add(videoId);

    // Split line by tabs first (standard Excel/Sheets copy-paste)
    let parts = rawLine.split("\t").map((p) => p.trim());
    if (parts.length <= 1) {
      // Try comma delimiter if no tabs
      parts = rawLine.split(",").map((p) => p.trim());
    }

    // Default structure based on user sample:
    // [0] Team: "Content Team"
    // [1] Date: "24-Sep"
    // [2] Month: "September"
    // [3] ChannelNameHint: "Main Channel" / "Electronics"
    // [4] Creator: "Vivek" / "Sanju Ghosh"
    // [5] Blank / SubRole
    // [6] Role: "In-House Editor"
    // [7] PlaybookUrl: "https://www.playbook.com/..."
    // [8] Topic: "3 in 1 Demat Account"
    // [9] Subtopic: "demat"
    // [10] Category: "investments"
    // [11] Persona: "savers"
    // ... trailing YouTube URL

    let team = parts[0] || "";
    const normalizedTeam = team.trim();
    // User requirement: filter out all other teams from the table, just keep Content Team
    if (normalizedTeam && !normalizedTeam.toLowerCase().includes("content")) {
      continue;
    }

    let date = parts[1] || "";
    let month = parts[2] || "";
    let channelNameHint = parts[3] || "";
    let creator = parts[4] || "";
    let role = parts[6] || parts[5] || "";
    let playbookUrl = "";
    let topic = "";
    let product = "";
    let business = "";
    let subtopic = "";
    let category = "";
    let persona = "";

    // Find playbook URL if present anywhere in the row
    const pbMatch = rawLine.match(PLAYBOOK_REGEX);
    if (pbMatch) {
      playbookUrl = pbMatch[0];
    }

    // If parts match expected columns:
    // [8] Topic: "Education Loan Against Property"
    // [9] Product: "loan-against-property"
    // [10] Business: "loans"
    // [11] Persona: "borrowers"
    if (parts.length >= 9) {
      topic = parts[8] || "";
      product = parts[9] || "";
      business = parts[10] || "";
      subtopic = product;
      category = business;
      persona = parts[11] || "";
    } else {
      // Fallback heuristics: find non-URL parts
      const cleanParts = parts.filter((p) => p && !p.match(YT_REGEX) && !p.match(PLAYBOOK_REGEX));
      if (cleanParts.length > 0) topic = cleanParts[cleanParts.length - 1];
    }

    items.push({
      id: videoId,
      youtubeUrl: fullYtUrl,
      channelNameHint: channelNameHint || undefined,
      creator: creator || undefined,
      date: date || undefined,
      month: month || undefined,
      role: role || undefined,
      playbookUrl: playbookUrl || undefined,
      topic: topic || undefined,
      product: product || undefined,
      business: business || undefined,
      subtopic: subtopic || undefined,
      category: category || undefined,
      persona: persona || undefined,
      team: team || "Content Team",
      rawRow: line,
    });
  }

  return items;
}

export async function parseSpreadsheetFile(file: File): Promise<IDVideoItem[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) {
          resolve([]);
          return;
        }

        const workbook = XLSX.read(buffer, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to CSV text
        const csvText = XLSX.utils.sheet_to_csv(worksheet);
        const parsedFromCsv = parseIDVideoText(csvText);

        if (parsedFromCsv.length > 0) {
          resolve(parsedFromCsv);
          return;
        }

        // Fallback: convert to 2D array and map
        const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const stringified = rawJson
          .map((row) => (Array.isArray(row) ? row.join("\t") : String(row)))
          .join("\n");
        resolve(parseIDVideoText(stringified));
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}

import {
  saveIdVideosDB,
  getIdVideosDB,
  saveHydratedVideosDB,
  getHydratedVideosDB,
  clearIdVideosDB,
} from "./idVideoStorage";

export {
  saveIdVideosDB,
  getIdVideosDB,
  saveHydratedVideosDB,
  getHydratedVideosDB,
  clearIdVideosDB,
};

const STORAGE_KEY = "f1_id_videos_metadata";
const HYDRATED_STORAGE_KEY = "f1_id_videos_hydrated_cache";

export function getIdVideosFromStorage(): IDVideoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveIdVideosToStorage(videos: IDVideoItem[]): void {
  saveIdVideosDB(videos);
  try {
    if (videos.length <= 500) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
    } else {
      localStorage.setItem("f1_id_videos_count", String(videos.length));
    }
  } catch (e) {
    // Quota exceeded is safely swallowed because IndexedDB has the full dataset
  }
}

export function getHydratedIdVideosCache(): any[] {
  try {
    const raw = localStorage.getItem(HYDRATED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveHydratedIdVideosCache(videos: any[]): void {
  saveHydratedVideosDB(videos);
  try {
    if (videos.length <= 300) {
      localStorage.setItem(HYDRATED_STORAGE_KEY, JSON.stringify(videos));
    }
  } catch (e) {
    // Quota exceeded is safely swallowed
  }
}
