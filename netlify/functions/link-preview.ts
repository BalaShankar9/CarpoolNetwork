import type { Handler } from '@netlify/functions';

type LinkPreview = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
};

const extractMeta = (html: string, name: string) => {
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=[\"']${name}[\"'][^>]+content=[\"']([^\"']+)[\"'][^>]*>`,
    'i'
  );
  const match = html.match(regex);
  return match?.[1];
};

const extractTitle = (html: string) => {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim();
};

export const handler: Handler = async (event) => {
  try {
    const url = event.queryStringParameters?.url || '';
    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing url parameter' }),
      };
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid url parameter' }),
      };
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Unsupported url protocol' }),
      };
    }

    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Failed to fetch url: ${response.status}` }),
      };
    }

    const html = await response.text();
    const preview: LinkPreview = {
      url,
      title: extractMeta(html, 'og:title') || extractTitle(html),
      description: extractMeta(html, 'og:description') || extractMeta(html, 'description'),
      image: extractMeta(html, 'og:image'),
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preview),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Link preview failed' }),
    };
  }
};
