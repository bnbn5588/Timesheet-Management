import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatCard } from '@/components/ui/stat-card'
import { formatCurrency, formatDate } from '@/lib/utils'

export default async function DashboardPage() {
  const session = (await getServerSession(authOptions))!
  const userId = session.user.id

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [employeeCount, projectCount, monthLogs] = await Promise.all([
    prisma.employee.count({ where: { employerId: userId } }),
    prisma.project.count({ where: { createdById: userId, isActive: true } }),
    prisma.timeLog.findMany({
      where: { employee: { employerId: userId }, date: { gte: monthStart } },
      include: {
        employee: { select: { name: true } },
        project: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 10,
    }),
  ])

  const totalHours = monthLogs.reduce((s, l) => s + l.hours, 0)
  const totalOT = monthLogs.reduce((s, l) => s + l.overtimeHours, 0)
  const totalCost = monthLogs.reduce((s, l) => s + l.totalCost, 0)
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Overview for {monthName}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Employees"
          value={employeeCount}
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          title="Active Projects"
          value={projectCount}
          color="purple"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          title="Hours This Month"
          value={`${totalHours.toFixed(1)}h`}
          subtitle={`+ ${totalOT.toFixed(1)}h OT`}
          color="green"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Total Cost"
          value={formatCurrency(totalCost)}
          subtitle="this month"
          color="orange"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Recent logs table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Entries</h2>
          <span className="text-sm text-gray-400">{monthName}</span>
        </div>

        {monthLogs.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">No entries this month.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <th className="px-5 py-3 text-left font-medium">Date</th>
                    <th className="px-5 py-3 text-left font-medium">Name</th>
                    <th className="px-5 py-3 text-left font-medium">Project</th>
                    <th className="px-5 py-3 text-right font-medium">Hrs</th>
                    <th className="px-5 py-3 text-right font-medium">OT</th>
                    <th className="px-5 py-3 text-right font-medium">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {monthLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-700 whitespace-nowrap">{formatDate(log.date)}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">{log.employee.name}</td>
                      <td className="px-5 py-3 text-gray-700">{log.project.name}</td>
                      <td className="px-5 py-3 text-right text-gray-700">{log.hours}</td>
                      <td className="px-5 py-3 text-right text-gray-700">{log.overtimeHours}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">{formatCurrency(log.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {monthLogs.map((log) => (
                <div key={log.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{log.employee.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{log.project.name} · {formatDate(log.date)}</p>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm shrink-0">{formatCurrency(log.totalCost)}</p>
                  </div>
                  <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
                    <span>{log.hours}h regular</span>
                    {log.overtimeHours > 0 && <span>{log.overtimeHours}h OT</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
