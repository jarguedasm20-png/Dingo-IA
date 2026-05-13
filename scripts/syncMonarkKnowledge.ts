type PageRecord = {
  url: string;
  title: string;
  headings: string[];
  text: string;
};

type KnowledgeChunk = {
  id: string;
  url: string;
  title: string;
  headings: string[];
  keywords: string[];
  text: string;
};

const siteRoot = "https://monarkcr.com";
const outputPath = new URL("../base44/functions/dingoAi/monarkKnowledge.json", import.meta.url);
const maxPages = 40;
const chunkSize = 1200;
const chunkOverlap = 180;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ");
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function htmlToText(html: string) {
  return normalizeWhitespace(
    decodeEntities(
      stripHtml(html)
        .replace(/<\/(h1|h2|h3|h4|h5|h6|p|li|section|article|div)>/gi, "\n")
        .replace(/<[^>]+>/g, " "),
    ),
  );
}

function extractTitle(html: string, fallbackUrl: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  return normalizeWhitespace(decodeEntities((title || h1 || fallbackUrl).replace(/<[^>]+>/g, " ")));
}

function extractHeadings(html: string) {
  return [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((match) => normalizeWhitespace(decodeEntities(match[1].replace(/<[^>]+>/g, " "))))
    .filter(Boolean)
    .slice(0, 12);
}

function sameSiteUrl(url: string) {
  try {
    const parsed = new URL(url, siteRoot);
    parsed.hash = "";
    if (parsed.hostname.replace(/^www\./, "") !== "monarkcr.com") return null;
    if (/\.(png|jpg|jpeg|gif|webp|svg|pdf|zip)$/i.test(parsed.pathname)) return null;
    return parsed.href.replace(/\/$/, "");
  } catch {
    return null;
  }
}

function extractLinks(html: string, pageUrl: string) {
  return [...html.matchAll(/href=["']([^"']+)["']/gi)]
    .map((match) => sameSiteUrl(new URL(match[1], pageUrl).href))
    .filter((url): url is string => Boolean(url));
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "DingoKnowledgeSync/1.0 (+https://monarkcr.com)",
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return await response.text();
}

async function readSitemap() {
  try {
    const xml = await fetchText(`${siteRoot}/sitemap.xml`);
    return [...xml.matchAll(/<loc>(.*?)<\/loc>/gi)]
      .map((match) => sameSiteUrl(match[1]))
      .filter((url): url is string => Boolean(url));
  } catch {
    return [];
  }
}

function keywordCandidates(page: PageRecord) {
  const text = `${page.title} ${page.headings.join(" ")} ${page.text}`.toLowerCase();
  const candidates = [
    "architecture",
    "construction",
    "costa rica",
    "guanacaste",
    "tropical",
    "sustainable",
    "ecological",
    "design",
    "property",
    "advisory",
    "contact",
    "projects",
    "consultation",
    "materials",
    "passive design",
    "craftsmanship",
  ];
  return candidates.filter((candidate) => text.includes(candidate));
}

function chunkPage(page: PageRecord) {
  const chunks: KnowledgeChunk[] = [];
  const text = page.text;
  let start = 0;
  let index = 1;

  while (start < text.length) {
    const end = Math.min(text.length, start + chunkSize);
    const chunkText = text.slice(start, end).trim();
    if (chunkText.length > 160) {
      const slug = page.url
        .replace(/^https?:\/\//, "")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();
      chunks.push({
        id: `${slug}-${index}`,
        url: page.url,
        title: page.title,
        headings: page.headings,
        keywords: keywordCandidates(page),
        text: chunkText,
      });
      index += 1;
    }
    start = end - chunkOverlap;
    if (start < 0 || end === text.length) break;
  }

  return chunks;
}

async function crawl() {
  const sitemapUrls = await readSitemap();
  const queue = sitemapUrls.length ? sitemapUrls : [siteRoot];
  const visited = new Set<string>();
  const pages: PageRecord[] = [];

  while (queue.length && visited.size < maxPages) {
    const url = queue.shift();
    if (!url || visited.has(url)) continue;
    visited.add(url);

    try {
      const html = await fetchText(url);
      const text = htmlToText(html);
      if (text.length > 160) {
        pages.push({
          url,
          title: extractTitle(html, url),
          headings: extractHeadings(html),
          text,
        });
      }

      if (!sitemapUrls.length) {
        for (const link of extractLinks(html, url)) {
          if (!visited.has(link) && !queue.includes(link)) queue.push(link);
        }
      }
    } catch (error) {
      console.warn(`Skipping ${url}: ${(error as Error).message}`);
    }
  }

  const chunks = pages.flatMap(chunkPage);
  const payload = {
    generatedAt: new Date().toISOString(),
    source: siteRoot,
    pageCount: pages.length,
    chunkCount: chunks.length,
    chunks,
  };

  await Deno.writeTextFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Saved ${chunks.length} chunks from ${pages.length} pages to ${outputPath.pathname}`);
}

await crawl();
