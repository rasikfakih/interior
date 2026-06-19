import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { name, email, phone, message } = await req.json();
  
  // Here you would typically send an email or store in DB
  // For now, we'll just return success
  console.log('Contact form submission:', { name, email, phone, message });
  
  return NextResponse.json({ success: true, message: 'Thank you for your message. We will contact you soon.' });
}
