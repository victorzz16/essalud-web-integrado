import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Api, Appointment, message } from './api';

interface CalendarCell {
  key: string;
  day: number;
  inMonth: boolean;
  count: number;
}

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-heading">
      <div>
        <span class="eyebrow">ORGANIZA TU ATENCIÓN</span>
        <h1>Calendario de citas</h1>
        <p class="muted">Consulta tus reservas por fecha y revisa los detalles de cada atención.</p>
      </div>
      <a class="primary" routerLink="/reservar">＋ Nueva cita</a>
    </div>
    @if (error) { <div class="alert error" role="alert">{{error}}</div> }
    <div class="calendar-layout">
      <section class="panel calendar-panel">
        <div class="calendar-toolbar">
          <div class="calendar-month-controls">
            <button class="calendar-nav" type="button" aria-label="Mes anterior" (click)="moveMonth(-1)">‹</button>
            <h2>{{monthLabel}}</h2>
            <button class="calendar-nav" type="button" aria-label="Mes siguiente" (click)="moveMonth(1)">›</button>
          </div>
          <button class="secondary" type="button" (click)="goToday()">Hoy</button>
        </div>
        <div class="calendar-weekdays">
          @for (weekday of weekdays; track weekday) { <span>{{weekday}}</span> }
        </div>
        <div class="calendar-grid">
          @for (cell of daysGrid; track cell.key) {
            <button type="button" class="calendar-day"
              [class.outside-month]="!cell.inMonth"
              [class.selected]="cell.key===selectedDay"
              [class.has-events]="cell.count>0"
              (click)="selectDay(cell.key)">
              <span>{{cell.day}}</span>
              @if (cell.count>0) { <small>{{cell.count}} {{cell.count===1?'cita':'citas'}}</small> }
            </button>
          }
        </div>
        <div class="calendar-legend"><span><i></i> Día con citas</span><span><i class="legend-selected"></i> Día seleccionado</span></div>
      </section>
      <section class="panel calendar-agenda">
        <div class="calendar-agenda-heading">
          <div><span class="eyebrow">DETALLE DEL DÍA</span><h2>{{selectedLabel}}</h2></div>
          <span class="tag">{{selectedAppointments.length}} {{selectedAppointments.length===1?'atención':'atenciones'}}</span>
        </div>
        @if (loading) {
          <div class="empty"><span>▦</span><p>Cargando calendario…</p></div>
        } @else {
          @for (appointment of selectedAppointments; track appointment.id) {
            <article class="calendar-event">
              <div class="calendar-event-time">{{appointment.starts_at | date:'HH:mm':'-0500'}}<small>{{appointment.ends_at | date:'HH:mm':'-0500'}}</small></div>
              <div class="calendar-event-info">
                <span class="badge" [class.cancelled]="appointment.status==='CANCELADA'">{{appointment.status}}</span>
                <h3>{{appointment.specialty}}</h3>
                <p>{{appointment.doctor}}</p>
                <small>📍 {{appointment.facility}}</small>
                <small>Comprobante #{{appointment.id}}</small>
              </div>
            </article>
          } @empty {
            <div class="empty calendar-empty"><span>▦</span><h3>Sin citas para este día</h3><p>Selecciona otra fecha o reserva una nueva atención.</p><a routerLink="/reservar" class="secondary">Reservar cita</a></div>
          }
        }
      </section>
    </div>
  `
})
export class CalendarPage implements OnInit {
  api = inject(Api);
  rows: Appointment[] = [];
  error = '';
  loading = false;
  weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  year = new Date().getFullYear();
  month = new Date().getMonth();
  selectedDay = this.keyOf(new Date());

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.get<Appointment[]>('/appointments').subscribe({
      next: rows => { this.rows = rows; this.loading = false; },
      error: e => { this.error = message(e); this.loading = false; }
    });
  }

  keyOf(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  localDay(appointment: Appointment) {
    return new Date(new Date(appointment.starts_at).getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0,10);
  }

  get monthLabel() {
    return new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(this.year, this.month, 1)));
  }

  get selectedLabel() {
    const date = new Date(`${this.selectedDay}T12:00:00-05:00`);
    return new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Lima' }).format(date);
  }

  get daysGrid(): CalendarCell[] {
    const first = new Date(Date.UTC(this.year, this.month, 1));
    const startOffset = first.getUTCDay();
    const daysInMonth = new Date(Date.UTC(this.year, this.month + 1, 0)).getUTCDate();
    const previousMonthDays = new Date(Date.UTC(this.year, this.month, 0)).getUTCDate();
    const counts = new Map<string, number>();
    for (const appointment of this.rows) {
      const key = this.localDay(appointment);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from({ length: 42 }, (_, index) => {
      const offset = index - startOffset + 1;
      let date: Date;
      let inMonth = true;
      if (offset < 1) {
        date = new Date(Date.UTC(this.year, this.month - 1, previousMonthDays + offset));
        inMonth = false;
      } else if (offset > daysInMonth) {
        date = new Date(Date.UTC(this.year, this.month + 1, offset - daysInMonth));
        inMonth = false;
      } else {
        date = new Date(Date.UTC(this.year, this.month, offset));
      }
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;
      return { key, day: date.getUTCDate(), inMonth, count: counts.get(key) || 0 };
    });
  }

  get selectedAppointments() {
    return this.rows.filter(row => this.localDay(row) === this.selectedDay)
      .sort((a,b) => a.starts_at.localeCompare(b.starts_at));
  }

  selectDay(key: string) {
    this.selectedDay = key;
    const date = new Date(`${key}T12:00:00Z`);
    this.year = date.getUTCFullYear();
    this.month = date.getUTCMonth();
  }

  moveMonth(direction: number) {
    const date = new Date(Date.UTC(this.year, this.month + direction, 1));
    this.year = date.getUTCFullYear();
    this.month = date.getUTCMonth();
    this.selectedDay = this.keyOf(new Date(this.year, this.month, 1));
  }

  goToday() {
    const today = new Date();
    this.year = today.getFullYear();
    this.month = today.getMonth();
    this.selectedDay = this.keyOf(today);
  }
}
