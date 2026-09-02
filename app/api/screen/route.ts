import { NextResponse } from 'next/server'

const keywords = ['react', 'next.js', 'typescript', 'javascript', 'node', 'python', 'sql', 'aws']

export async function POST(request: Request) {
  try {
    const { resume = '', jobDescription = '' } = await request.json()
    const resumeText = String(resume).toLowerCase()
    const jobText = String(jobDescription).toLowerCase()
    const required = keywords.filter((skill) => jobText.includes(skill))
    const matched = required.filter((skill) => resumeText.includes(skill))
    const score = required.length ? Math.round((matched.length / required.length) * 100) : 70

    return NextResponse.json({
      score,
      recommendation: score >= 80 ? 'shortlist' : score >= 60 ? 'review' : 'reject',
      matchedSkills: matched,
      missingSkills: required.filter((skill) => !matched.includes(skill)),
      summary: score >= 80 ? 'Strong alignment with the role.' : score >= 60 ? 'Potential fit; review experience in detail.' : 'Limited alignment with the listed requirements.',
    })
  } catch {
    return NextResponse.json({ error: 'Invalid screening request' }, { status: 400 })
  }
}
