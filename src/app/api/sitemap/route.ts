import { NextResponse } from 'next/server'
import { ensureMigrated, pgMany } from '@/lib/pg'

export const dynamic = 'force-dynamic'

export async function GET() {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  const projectList: Array<{ slug: string }> = []
  const journalList: Array<{ slug: string }> = []
  try {
    await ensureMigrated()
    const projects = await pgMany<{ slug: string }>(
      `SELECT slug FROM projects WHERE is_published = TRUE ORDER BY id ASC`
    )
    const journals = await pgMany<{ slug: string }>(
      `SELECT slug FROM journal_posts WHERE is_published = TRUE ORDER BY id ASC`
    )
    projectList.push(...projects)
    journalList.push(...journals)
  } catch {
    // keep empty lists on cold boot
  }

  const staticRoutes = [
    '',
    '/about',
    '/contact',
    '/projects',
    '/journal',
  ]

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticRoutes.map(route => `  <url>
    <loc>${baseUrl}${route}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${route === '' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
  ${projectList.map(p => `  <url>
    <loc>${baseUrl}/projects/${p.slug}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join('\n')}
  ${journalList.map(j => `  <url>
    <loc>${baseUrl}/journal/${j.slug}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join('\n')}
</urlset>`

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}
