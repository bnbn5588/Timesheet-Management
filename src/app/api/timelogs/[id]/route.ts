import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getLogForUser(id: string, userId: string) {
  return prisma.timeLog.findFirst({
    where: { id, employee: { employerId: userId } },
  })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const log = await getLogForUser(id, session.user.id)
  if (!log) return NextResponse.json({ error: 'Time log not found.' }, { status: 404 })

  const { date, employeeId, projectId, hours, overtimeHours, notes } = await request.json()

  const regularHours = hours !== undefined ? Math.max(0, Number(hours)) : log.hours
  const otHours = overtimeHours !== undefined ? Math.max(0, Number(overtimeHours)) : log.overtimeHours
  const targetEmployeeId = employeeId ?? log.employeeId

  const employee = await prisma.employee.findUnique({
    where: { id: targetEmployeeId },
    select: { hourlyRate: true, overtimeRate: true, employerId: true },
  })

  if (!employee || employee.employerId !== session.user.id) {
    return NextResponse.json({ error: 'Employee not found.' }, { status: 404 })
  }

  const totalCost = regularHours * employee.hourlyRate + otHours * employee.overtimeRate

  const updated = await prisma.timeLog.update({
    where: { id },
    data: {
      date: date ? new Date(date) : log.date,
      employeeId: targetEmployeeId,
      projectId: projectId ?? log.projectId,
      hours: regularHours,
      overtimeHours: otHours,
      totalCost,
      notes: notes !== undefined ? notes : log.notes,
    },
    include: {
      employee: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const log = await getLogForUser(id, session.user.id)
  if (!log) return NextResponse.json({ error: 'Time log not found.' }, { status: 404 })

  await prisma.timeLog.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
