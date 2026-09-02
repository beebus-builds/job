import { NextResponse } from 'next/server'
import { jobs } from '@/lib/data'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.toLowerCase().trim()

  if (!query) return NextResponse.json({ jobs })

  const filtered = jobs.filter((job) =>
    [job.title, job.company, job.location, job.description, ...job.tags]
      .join(' ')
      .toLowerCase()
      .includes(query),
  )

  return NextResponse.json({ jobs: filtered })
}
