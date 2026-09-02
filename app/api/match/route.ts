import { NextResponse } from 'next/server'
import { calculateMatch } from '@/lib/matching'

export async function POST(request: Request) {
  try {
    const input = await request.json()
    const result = calculateMatch(input)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Invalid match request' }, { status: 400 })
  }
}
