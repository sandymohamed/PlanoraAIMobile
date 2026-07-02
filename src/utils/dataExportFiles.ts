import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { PlanoraExportData, PlanoraExportGoal, PlanoraExportRecord, PlanoraExportRoutine } from '@/types/dataExport';

const NESTED_KEYS = new Set(['milestones', 'routineTasks']);

function cellValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value);
}

function flattenRecord(record: PlanoraExportRecord, extra?: PlanoraExportRecord): Record<string, string> {
  const row: Record<string, string> = {};
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      row[key] = cellValue(value);
    }
  }
  for (const [key, value] of Object.entries(record)) {
    if (NESTED_KEYS.has(key)) continue;
    row[key] = cellValue(value);
  }
  return row;
}

function flattenMilestones(goals: PlanoraExportGoal[]): Record<string, string>[] {
  return goals.flatMap((goal) =>
    (goal.milestones ?? []).map((milestone) =>
      flattenRecord(milestone, { goalId: goal.id, goalTitle: goal.title })
    )
  );
}

function flattenRoutineTasks(routines: PlanoraExportRoutine[]): Record<string, string>[] {
  return routines.flatMap((routine) =>
    (routine.routineTasks ?? []).map((task) =>
      flattenRecord(task, { routineId: routine.id, routineTitle: routine.title })
    )
  );
}

function appendSheet(workbook: XLSX.WorkBook, sheetName: string, rows: Record<string, string>[]) {
  const safeName = sheetName.slice(0, 31);
  const worksheet =
    rows.length > 0
      ? XLSX.utils.json_to_sheet(rows)
      : XLSX.utils.aoa_to_sheet([['No records in this section']]);
  XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
}

export function buildExcelBase64(data: PlanoraExportData): string {
  const workbook = XLSX.utils.book_new();

  appendSheet(workbook, 'Profile', data.user ? [flattenRecord(data.user)] : []);
  appendSheet(workbook, 'Tasks', data.tasks.map((t) => flattenRecord(t)));
  appendSheet(workbook, 'Projects', data.projects.map((p) => flattenRecord(p)));
  appendSheet(workbook, 'Goals', data.goals.map((g) => flattenRecord(g)));
  appendSheet(workbook, 'Milestones', flattenMilestones(data.goals));
  appendSheet(workbook, 'Alarms', data.alarms.map((a) => flattenRecord(a)));
  appendSheet(workbook, 'Reminders', data.reminders.map((r) => flattenRecord(r)));
  appendSheet(workbook, 'Routines', data.routines.map((r) => flattenRecord(r)));
  appendSheet(workbook, 'Routine tasks', flattenRoutineTasks(data.routines));
  appendSheet(workbook, 'Timers', data.timers.map((t) => flattenRecord(t)));
  appendSheet(workbook, 'Weekly reviews', data.weeklyReviews.map((w) => flattenRecord(w)));

  return XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tableSection(title: string, rows: Record<string, string>[]): string {
  if (rows.length === 0) {
    return `<h2>${escapeHtml(title)}</h2><p><em>No records</em></p>`;
  }
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const header = columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('');
  const body = rows
    .map((row) => {
      const cells = columns.map((c) => `<td>${escapeHtml(row[c] ?? '')}</td>`).join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  return `<h2>${escapeHtml(title)}</h2><table border="1" cellpadding="4" cellspacing="0"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

export function buildWordDocumentHtml(data: PlanoraExportData): string {
  const exportedLabel = data.exportedAt
    ? format(new Date(data.exportedAt), 'MMM d, yyyy h:mm a')
    : format(new Date(), 'MMM d, yyyy h:mm a');

  const sections: Array<[string, Record<string, string>[]]> = [
    ['Profile', data.user ? [flattenRecord(data.user)] : []],
    ['Tasks', data.tasks.map((t) => flattenRecord(t))],
    ['Projects', data.projects.map((p) => flattenRecord(p))],
    ['Goals', data.goals.map((g) => flattenRecord(g))],
    ['Milestones', flattenMilestones(data.goals)],
    ['Alarms', data.alarms.map((a) => flattenRecord(a))],
    ['Reminders', data.reminders.map((r) => flattenRecord(r))],
    ['Routines', data.routines.map((r) => flattenRecord(r))],
    ['Routine tasks', flattenRoutineTasks(data.routines)],
    ['Timers', data.timers.map((t) => flattenRecord(t))],
    ['Weekly reviews', data.weeklyReviews.map((w) => flattenRecord(w))],
  ];

  const body = sections.map(([title, rows]) => tableSection(title, rows)).join('<br/>');

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>Planora export</title></head>
<body>
<h1>Planora data export</h1>
<p>Exported ${escapeHtml(exportedLabel)}</p>
${body}
</body>
</html>`;
}

export function exportFileBaseName(exportedAt?: string): string {
  const stamp = exportedAt ? format(new Date(exportedAt), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  return `planora-export-${stamp}`;
}
