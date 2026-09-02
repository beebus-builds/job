import { NextResponse } from 'next/server'
import { applications } from '@/lib/data'

export async function GET() {
  return NextResponse.json({ applications })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const application = {
      id: `app-${Date.now()}`,
      job: body.job ?? 'New opportunity',
      company: body.company ?? 'Company',
      stage: 'Applied',
      match: Number(body.match ?? 0),
      applied: new Date().toISOString().slice(0, 10),
    }

    return NextResponse.json({ application }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid application request' }, { status: 400 })
  }
}
