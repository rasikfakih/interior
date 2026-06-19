import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects, journalPosts } from '@/lib/schema'

export async function GET() {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  
  // Fetch dynamic routes
  const projectList = db.select().from(projects).all()
  const journalList = db.select().from(journalPosts).all()

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
