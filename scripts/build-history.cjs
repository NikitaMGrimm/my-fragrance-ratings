#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FILE_PATH = 'public/constants.csv';
const OUTPUT_PATH = 'public/history.json';
const PAGE_SIZE = 100;

const run = (command) => execSync(command, { encoding: 'utf8' }).trim();

const parseRepoInfo = () => {
  const envOwner = process.env.REPO_OWNER;
  const envRepo = process.env.REPO_NAME;
  if (envOwner && envRepo) {
    return { owner: envOwner, repo: envRepo };
  }

  let remote = '';
  try {
    remote = run('git config --get remote.origin.url');
  } catch {
    return null;
  }

  if (remote.startsWith('git@')) {
    const match = remote.match(/git@[^:]+:([^/]+)\/(.+?)(\.git)?$/);
    if (match) return { owner: match[1], repo: match[2] };
  }

  if (remote.startsWith('https://')) {
    const match = remote.match(/https:\/\/[^/]+\/([^/]+)\/(.+?)(\.git)?$/);
    if (match) return { owner: match[1], repo: match[2] };
  }

  return null;
};

const parseCSV = (csvText) => {
  const lines = csvText.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const splitLine = (line) =>
    line
      .split(/,(?=(?:(?:[^\"]*\"){2})*[^\"]*$)/)
      .map((val) => val.trim().replace(/^\"|\"$/g, ''));

  const headerRaw = splitLine(lines[0]);
  const headers = headerRaw.map((h) => h.trim());
  const results = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitLine(lines[i]);
    if (cols.length === 0) continue;

    const obj = {};
    let hasValues = false;

    headers.forEach((key, index) => {
      let val = cols[index];
      if (val !== undefined) {
        hasValues = true;
        val = val.trim();
        obj[key] = val;
      }
    });

    if (hasValues) results.push(obj);
  }

  return results;
};

const parseRelativeTime = (value) => {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();

  if (normalized === 'today' || normalized === 'just now') return 0;
  if (normalized === 'yesterday') return 24 * 60 * 60 * 1000;

  const match = normalized.match(/(\d+)\s*(minute|hour|day|week|month|year)s?\s*ago/);
  if (match) {
    const amount = Number(match[1]);
    const unit = match[2];
    return durationMs(amount, unit);
  }

  const articleMatch = normalized.match(/(a|an)\s*(minute|hour|day|week|month|year)\s*ago/);
  if (articleMatch) {
    return durationMs(1, articleMatch[2]);
  }

  return null;
};

const durationMs = (amount, unit) => {
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  switch (unit) {
    case 'minute':
      return amount * minute;
    case 'hour':
      return amount * hour;
    case 'day':
      return amount * day;
    case 'week':
      return amount * week;
    case 'month':
      return amount * month;
    case 'year':
      return amount * year;
    default:
      return null;
  }
};

const computeApproxDate = (commitDateIso, timeRatedRaw) => {
  const commitDate = new Date(commitDateIso);
  if (Number.isNaN(commitDate.valueOf())) return commitDateIso;

  if (timeRatedRaw) {
    const parsedAbsolute = new Date(timeRatedRaw);
    if (!Number.isNaN(parsedAbsolute.valueOf())) {
      return parsedAbsolute.toISOString();
    }

    const relative = parseRelativeTime(timeRatedRaw);
    if (relative !== null) {
      return new Date(commitDate.valueOf() - relative).toISOString();
    }
  }

  return commitDate.toISOString();
};

const getCommitHistory = () => {
  const output = run(`git log --follow --format='%H\t%cI\t%s%n' -- "${FILE_PATH}"`);
  if (!output) return [];
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('\t');
      const sha = parts[0];
      const date = parts[1];
      const message = parts.slice(2).join('\t');
      return { sha, date, message };
    })
    .filter((entry) => entry.sha && entry.date)
    .reverse();
};

const loadCsvAtCommit = (sha) => {
  try {
    return execSync(`git show ${sha}:${FILE_PATH}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
  } catch {
    return '';
  }
};

const main = () => {
  const repoInfo = parseRepoInfo();
  const commits = getCommitHistory();
  if (commits.length === 0) {
    console.error('No commits found for constants.csv');
    process.exit(1);
  }

  const historyMap = new Map();
  const commitEntries = [];

  commits.forEach((commit) => {
    const csvText = loadCsvAtCommit(commit.sha);
    if (!csvText) return;
    const rows = parseCSV(csvText);

    rows.forEach((row) => {
      const brand = row['Brand'] || row['brand'] || '';
      const name = row['Name'] || row['name'] || '';
      if (!brand || !name) return;

      const pid = row['PID'] || row['pid'] || '';
      const id = pid && pid !== '0' ? String(pid) : `${brand}|${name}`;
      const timeRatedRaw = row['Time Rated'] || row['time rated'] || row['timeRated'] || '';
      const ratingRaw = row['Rating'] || row['rating'] || '';
      const rating = Number.parseFloat(String(ratingRaw).replace(',', '.'));
      if (!Number.isFinite(rating)) return;

      const approxDate = computeApproxDate(commit.date, timeRatedRaw);
      const existing = historyMap.get(id) || {
        id,
        pid: pid ? String(pid) : '',
        brand,
        name,
        firstSeenAt: approxDate,
        ratings: []
      };

      if (!existing.firstSeenAt) {
        existing.firstSeenAt = approxDate;
      }

      const lastEntry = existing.ratings[existing.ratings.length - 1];
      if (!lastEntry || lastEntry.rating !== rating) {
        existing.ratings.push({
          rating,
          date: approxDate,
          commit: commit.sha,
          timeRated: timeRatedRaw,
          commitDate: commit.date
        });
      }

      historyMap.set(id, existing);
    });

    const labelDate = commit.date.slice(0, 10);
    const shortSha = commit.sha.slice(0, 7);
    const rawUrl = repoInfo
      ? `https://raw.githubusercontent.com/${repoInfo.owner}/${repoInfo.repo}/${commit.sha}/${FILE_PATH}`
      : '';
    commitEntries.push({
      sha: commit.sha,
      date: commit.date,
      message: commit.message || '',
      label: `${labelDate} · ${shortSha}${commit.message ? ` · ${commit.message}` : ''}`,
      rawUrl
    });
  });

  const fragrances = Array.from(historyMap.values()).sort((a, b) => {
    const brandCompare = a.brand.localeCompare(b.brand);
    if (brandCompare !== 0) return brandCompare;
    return a.name.localeCompare(b.name);
  });

  const output = {
    generatedAt: new Date().toISOString(),
    sourcePath: FILE_PATH,
    pageSize: PAGE_SIZE,
    commits: commitEntries,
    fragrances
  };

  const outputPath = path.resolve(process.cwd(), OUTPUT_PATH);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Wrote ${OUTPUT_PATH} with ${fragrances.length} fragrances and ${commitEntries.length} commits.`);
};

main();
