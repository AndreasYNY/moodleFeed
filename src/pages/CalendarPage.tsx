import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';
import type { DatesSetArg, EventClickArg, EventContentArg } from '@fullcalendar/core';
import { AlertCircle, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { format, formatDistanceToNow, isSameDay } from 'date-fns';
import { MouseEvent, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAssignments } from '../hooks/useAssignments';
import { getCourseColor } from '../lib/utils';
import type { AssignmentWithCourse } from '../types';
import './CalendarPage.css';

type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'listMonth';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  allDay: false;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  extendedProps: {
    courseId: number;
    courseName: string;
    status: string;
    assignmentId: number;
  };
}

const viewOptions: Array<{ label: string; value: CalendarView }> = [
  { label: 'Month', value: 'dayGridMonth' },
  { label: 'Week', value: 'timeGridWeek' },
  { label: 'List', value: 'listMonth' },
];

function assignmentDueDate(assignment: AssignmentWithCourse) {
  return assignment.duedate ? new Date(assignment.duedate * 1000) : null;
}

function assignmentStatus(assignment: AssignmentWithCourse) {
  if (assignment.submitted) return 'completed';
  const dueDate = assignmentDueDate(assignment);
  if (!dueDate) return 'upcoming';
  const diff = dueDate.getTime() - Date.now();
  if (diff < 0) return 'overdue';
  if (isSameDay(dueDate, new Date())) return 'dueToday';
  return 'upcoming';
}

function getEventColors(assignment: AssignmentWithCourse) {
  const status = assignmentStatus(assignment);
  if (status === 'overdue') return { bg: '#FCEBEB', text: '#A32D2D', border: '#F09595' };
  if (status === 'dueToday') return { bg: '#FAEEDA', text: '#854F0B', border: '#E0A93B' };
  if (status === 'completed') return { bg: '#EAF3DE', text: '#3B6D11', border: '#97C459' };
  const color = getCourseColor(assignment.course);
  return { bg: color.light, text: color.text, border: color.dot };
}

function formatRange(arg?: DatesSetArg) {
  if (!arg) return format(new Date(), 'MMMM yyyy');
  if (arg.view.type === 'timeGridWeek') {
    const end = new Date(arg.end);
    end.setDate(end.getDate() - 1);
    return `${format(arg.start, 'MMM d')} - ${format(end, 'd, yyyy')}`;
  }
  return format(arg.start, 'MMMM yyyy');
}

function renderEventContent(eventInfo: EventContentArg) {
  return (
    <div style={{ overflow: 'hidden', padding: '2px 5px' }}>
      <div style={{ fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {eventInfo.event.title}
      </div>
      {eventInfo.view.type === 'timeGridWeek' && eventInfo.event.start && (
        <div style={{ fontSize: 10, marginTop: 1, opacity: 0.8 }}>{format(eventInfo.event.start, 'h:mm a')}</div>
      )}
    </div>
  );
}

function eventsForDate(events: CalendarEvent[], date: Date) {
  return events.filter((event) => isSameDay(event.start, date));
}

function statusLabel(status: string) {
  if (status === 'overdue') return 'Overdue';
  if (status === 'dueToday') return 'Due today';
  if (status === 'completed') return 'Completed';
  return 'Not submitted';
}

export function CalendarPage() {
  const calendarRef = useRef<FullCalendar>(null);
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<CalendarView>('dayGridMonth');
  const [dateSet, setDateSet] = useState<DatesSetArg>();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [panelWidth, setPanelWidth] = useState(260);
  const assignmentsQuery = useAssignments();
  const assignments = useMemo(() => assignmentsQuery.data ?? [], [assignmentsQuery.data]);

  const calendarEvents = useMemo<CalendarEvent[]>(
    () =>
      assignments.flatMap((assignment) => {
        const dueDate = assignmentDueDate(assignment);
        if (!dueDate) return [];
        const colors = getEventColors(assignment);
        return [{
          id: String(assignment.id),
          title: assignment.name,
          start: dueDate,
          allDay: false,
          backgroundColor: colors.bg,
          textColor: colors.text,
          borderColor: colors.border,
          extendedProps: {
            courseId: assignment.course,
            courseName: assignment.courseName,
            status: assignmentStatus(assignment),
            assignmentId: assignment.id,
          },
        }];
      }),
    [assignments],
  );

  const selectedEvents = useMemo(() => eventsForDate(calendarEvents, selectedDate), [calendarEvents, selectedDate]);
  const overdueCount = assignments.filter((assignment) => assignmentStatus(assignment) === 'overdue').length;

  function changeView(view: CalendarView) {
    setActiveView(view);
    calendarRef.current?.getApi().changeView(view);
  }

  function handleDatesSet(arg: DatesSetArg) {
    setDateSet(arg);
    setActiveView(arg.view.type as CalendarView);
  }

  function handleDateClick(arg: DateClickArg) {
    setSelectedDate(arg.date);
  }

  function handleEventClick(arg: EventClickArg) {
    if (arg.event.start) setSelectedDate(arg.event.start);
  }

  function openAssignment(assignmentId: number) {
    navigate(`/assignments?assignment=${assignmentId}`);
  }

  function startResize(event: MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = panelWidth;

    function onMove(moveEvent: globalThis.MouseEvent) {
      const nextWidth = Math.min(420, Math.max(220, startWidth - (moveEvent.clientX - startX)));
      setPanelWidth(nextWidth);
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col bg-slate-50 md:h-screen md:min-h-0">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 md:h-[52px] md:flex-nowrap md:px-4 md:py-0">
        <button type="button" onClick={() => calendarRef.current?.getApi().prev()} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => calendarRef.current?.getApi().next()} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50">
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 text-[15px] font-medium text-slate-950 md:ml-2">{formatRange(dateSet)}</div>
        <button type="button" onClick={() => calendarRef.current?.getApi().today()} className="ml-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          Today
        </button>
        <div className="hidden flex-1 md:block" />
        {overdueCount > 0 && (
          <div className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
            <AlertCircle className="h-3.5 w-3.5" />
            {overdueCount} overdue
          </div>
        )}
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
          {viewOptions.map((view) => (
            <button
              key={view.value}
              type="button"
              onClick={() => changeView(view.value)}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                activeView === view.value
                  ? 'border-brand bg-active text-brand'
                  : 'border-transparent text-slate-500 hover:bg-slate-50'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>

      <div className="calendar-layout grid min-h-0 flex-1" style={{ '--panel-width': `${panelWidth}px` } as React.CSSProperties}>
        <section className="moodle-calendar min-h-[420px] bg-white p-2 md:min-h-0 md:p-4">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={false}
            height="100%"
            events={calendarEvents}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            datesSet={handleDatesSet}
            nowIndicator
            dayMaxEvents={3}
            eventDisplay="block"
            eventContent={renderEventContent}
          />
        </section>

        <aside className="relative flex min-h-0 flex-col border-t border-slate-200 bg-white md:border-l md:border-t-0">
          <div
            role="separator"
            aria-orientation="vertical"
            title="Resize details panel"
            onMouseDown={startResize}
            className="absolute inset-y-0 left-0 z-10 hidden w-2 -translate-x-1 cursor-col-resize md:block"
          />
          <div className="border-b border-slate-200 p-4">
            <div className="text-sm font-semibold text-slate-950">{format(selectedDate, 'EEEE, MMMM d')}</div>
            <div className="mt-1 text-xs text-slate-500">{selectedEvents.length} deadlines</div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {selectedEvents.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
                No deadlines for this day.
              </div>
            )}
            {selectedEvents.map((event) => {
              const colors = getCourseColor(event.extendedProps.courseId);
              const eventColors = {
                bg: event.backgroundColor,
                text: event.textColor,
                border: event.borderColor,
              };
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => openAssignment(event.extendedProps.assignmentId)}
                  className="mb-2 block w-full rounded-lg border border-slate-200 p-2.5 text-left hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="mb-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.dot }} />
                    <span className="truncate">{event.extendedProps.courseName}</span>
                  </div>
                  <div className="text-xs font-medium leading-5 text-slate-950">{event.title}</div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
                    <Clock className="h-3 w-3" />
                    {isSameDay(event.start, new Date())
                      ? `Due today · ${format(event.start, 'h:mm a')}`
                      : formatDistanceToNow(event.start, { addSuffix: true })}
                  </div>
                  <span
                    className="mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: eventColors.bg, borderColor: eventColors.border, color: eventColors.text }}
                  >
                    {statusLabel(event.extendedProps.status)}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </main>
  );
}
