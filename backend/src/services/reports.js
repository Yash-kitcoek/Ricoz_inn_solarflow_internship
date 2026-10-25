export function dateBounds(date) {
  const start = new Date(`${date}T00:00:00.000Z`)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start, end }
}

export function statusAt(task, cutoff) {
  const history = [...(task.statusHistory ?? [])].sort((a, b) => new Date(a.at) - new Date(b.at))
  let status
  for (const event of history) {
    if (new Date(event.at) > cutoff) break
    status = event.status
  }
  if (status) return status
  if (new Date(task.createdAt) <= cutoff) return task.status
  return null
}

export function dailyTaskGroups(tasks, date) {
  const { start, end } = dateBounds(date)
  const endOfDay = new Date(end.getTime() - 1)
  const completedTasks = []
  const pendingTasks = []
  const overdueTasks = []
  const blockedTasks = []

  for (const task of tasks) {
    const status = statusAt(task, endOfDay)
    if (!status) continue
    const completedOnDate = (task.statusHistory ?? []).some(event =>
      event.status === 'Completed' && new Date(event.at) >= start && new Date(event.at) < end
    )
    if (completedOnDate) completedTasks.push(task)
    if (status === 'To Do' || status === 'In Progress') pendingTasks.push(task)
    if (status === 'Blocked') blockedTasks.push(task)
    if (task.dueDate && new Date(task.dueDate) < end && status !== 'Completed') overdueTasks.push(task)
  }

  return { completedTasks, pendingTasks, overdueTasks, blockedTasks }
}
