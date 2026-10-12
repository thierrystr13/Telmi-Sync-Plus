const normalized = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
export function searchStories(catalog, filters = {}) {
  const {query = '', source, kind, category, favorites, age, duration} = filters
  const terms = normalized(query).trim().split(/\s+/).filter(Boolean)
  const priorities = new Map(catalog.sources.map(s => [s.id, s.priority || 3]))
  return catalog.episodes.filter(e => {
    const text = normalized([e.title, e.description, ...(e.themes || [])].join(' '))
    if (!terms.every(term => text.includes(term)) || (source && e.sourceId !== source) ||
      (kind && e.kind !== kind) || (category && !(e.categories || []).includes(category)) ||
      (favorites && !catalog.favorites.includes(e.id))) return false
    if (age) {const [a, b] = age.split('-').map(Number); if (!e.age || e.age < a || e.age > b) return false}
    if (duration) {const [a, b] = duration.split('-').map(Number); if (!e.duration || e.duration < a || e.duration >= b) return false}
    return true
  }).sort((a, b) => Number(b.kind === 'Histoire indépendante') - Number(a.kind === 'Histoire indépendante') ||
    (priorities.get(a.sourceId) || 3) - (priorities.get(b.sourceId) || 3) || a.title.localeCompare(b.title, 'fr'))
}
