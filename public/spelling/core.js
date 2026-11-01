export const OUTCOMES = {
  correct: {label:'Correct', hint:'Right on the first try', icon:'✓'},
  incorrect: {label:'Incorrect', hint:'Needs more practice', icon:'×'},
  slow: {label:'Slow', hint:'Correct, with extra time', icon:'◷'},
  two: {label:'Two tries', hint:'Correct on the second try', icon:'↻'},
};
export function latestResults(attempts, studentId) {
  const result = new Map();
  for (const attempt of attempts) {
    if (attempt.studentId !== studentId || attempt.voided) continue;
    const old = result.get(attempt.wordId);
    if (!old || attempt.createdAt > old.createdAt || (attempt.createdAt === old.createdAt && attempt.id > old.id)) result.set(attempt.wordId, attempt);
  }
  return result;
}
export function selectWords(words, latest, {group='all', filter='all', order='sheet'}, random=Math.random) {
  const result = words.filter(w => (group === 'all' || w.groups.includes(group)) && (
    filter === 'all' || (filter === 'new' ? !latest.has(w.id) : filter === 'review' ? ['incorrect','slow','two'].includes(latest.get(w.id)?.outcome) : latest.get(w.id)?.outcome === filter)
  ));
  if (order === 'alphabetical') result.sort((a,b)=>a.text.localeCompare(b.text));
  if (order === 'random') for (let i=result.length-1;i>0;i--) { const j=Math.floor(random()*(i+1)); [result[i],result[j]]=[result[j],result[i]]; }
  return result;
}
export function countResults(words, latest) {
  const counts={correct:0,incorrect:0,slow:0,two:0,new:0};
  for(const word of words) counts[latest.get(word.id)?.outcome || 'new']++;
  return counts;
}
export function csvCell(value) { return '"'+String(value ?? '').replace(/^[=+@\-]/,"'$&").replaceAll('"','""')+'"'; }
