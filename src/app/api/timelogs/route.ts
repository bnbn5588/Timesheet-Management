import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const employeeId = searchParams.get('employeeId')
  const projectId = searchParams.get('projectId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  // Resolve which employee IDs belong to this user
  const userEmployees = await prisma.employee.findMany({
    where: { employerId: session.user.id },
    select: { id: true },
  })
  const ownedIds = userEmployees.map((e) => e.id)

  const where: Record<string, unknown> = {
    employeeId:
      employeeId && ownedIds.includes(employeeId)
        ? employeeId
        : { in: ownedIds },
  }

  if (projectId) where.projectId = projectId

  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      dateFilter.lte = end
    }
    where.date = dateFilter
  }

  const logs = await prisma.timeLog.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json(logs)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { date, employeeId, projectId, hours, overtimeHours, notes } = await request.json()

  if (!date || !employeeId || !projectId || !hours) {
    return NextResponse.json({ error: 'Date, employee, project and hours are required.' }, { status: 400 })
  }

  // Verify the employee belongs to this user
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, employerId: session.user.id },
  })
  if (!employee) return NextResponse.json({ error: 'Employee not found.' }, { status: 404 })

  // Verify the project belongs to this user
  const project = await prisma.project.findFirst({
    where: { id: projectId, createdById: session.user.id },
  })
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })

  const regularHours = Math.max(0, Number(hours))
  const otHours = Math.max(0, Number(overtimeHours) || 0)
  const totalCost = regularHours * employee.hourlyRate + otHours * employee.overtimeRate

  const log = await prisma.timeLog.create({
    data: {
      date: new Date(date),
      hours: regularHours,
      overtimeHours: otHours,
      totalCost,
      notes: notes || null,
      employeeId,
      projectId,
    },
    include: {
      employee: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(log, { status: 201 })
}
