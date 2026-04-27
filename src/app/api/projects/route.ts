import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const activeOnly = searchParams.get('active') === 'true'

  const projects = await prisma.project.findMany({
    where: { createdById: session.user.id, ...(activeOnly ? { isActive: true } : {}) },
    select: { id: true, name: true, description: true, isActive: true, createdAt: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(projects)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description } = await request.json()

  if (!name) {
    return NextResponse.json({ error: 'Project name is required.' }, { status: 400 })
  }

  const project = await prisma.project.create({
    data: { name, description: description || null, createdById: session.user.id },
    select: { id: true, name: true, description: true, isActive: true, createdAt: true },
  })

  return NextResponse.json(project, { status: 201 })
}
