import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const employees = await prisma.employee.findMany({
    where: { employerId: session.user.id },
    select: { id: true, name: true, hourlyRate: true, overtimeRate: true, createdAt: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(employees)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, hourlyRate, overtimeRate } = await request.json()

  if (!name) {
    return NextResponse.json({ error: 'Employee name is required.' }, { status: 400 })
  }

  const employee = await prisma.employee.create({
    data: {
      name,
      hourlyRate: Number(hourlyRate) || 0,
      overtimeRate: Number(overtimeRate) || 0,
      employerId: session.user.id,
    },
    select: { id: true, name: true, hourlyRate: true, overtimeRate: true, createdAt: true },
  })

  return NextResponse.json(employee, { status: 201 })
}
