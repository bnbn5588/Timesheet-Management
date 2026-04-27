import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getProjectForUser(id: string, createdById: string) {
  return prisma.project.findFirst({ where: { id, createdById } })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const project = await getProjectForUser(id, session.user.id)
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })

  const { name, description, isActive } = await request.json()

  const updated = await prisma.project.update({
    where: { id },
    data: {
      name: name ?? project.name,
      description: description !== undefined ? description : project.description,
      isActive: isActive !== undefined ? Boolean(isActive) : project.isActive,
    },
    select: { id: true, name: true, description: true, isActive: true, createdAt: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const project = await getProjectForUser(id, session.user.id)
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })

  await prisma.timeLog.deleteMany({ where: { projectId: id } })
  await prisma.project.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
