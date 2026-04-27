import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getEmployeeForUser(id: string, employerId: string) {
  return prisma.employee.findFirst({ where: { id, employerId } })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const emp = await getEmployeeForUser(id, session.user.id)
  if (!emp) return NextResponse.json({ error: 'Employee not found.' }, { status: 404 })

  const { name, hourlyRate, overtimeRate } = await request.json()

  const updated = await prisma.employee.update({
    where: { id },
    data: {
      name: name ?? emp.name,
      hourlyRate: hourlyRate !== undefined ? Number(hourlyRate) : emp.hourlyRate,
      overtimeRate: overtimeRate !== undefined ? Number(overtimeRate) : emp.overtimeRate,
    },
    select: { id: true, name: true, hourlyRate: true, overtimeRate: true, createdAt: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const emp = await getEmployeeForUser(id, session.user.id)
  if (!emp) return NextResponse.json({ error: 'Employee not found.' }, { status: 404 })

  await prisma.timeLog.deleteMany({ where: { employeeId: id } })
  await prisma.employee.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
