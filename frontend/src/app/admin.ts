import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Api, Doctor, Specialty, Slot, Appointment, Facility, ScheduleBlock, message
} from './api';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-heading">
      <div>
        <span class="eyebrow">GESTIÓN DEL ESTABLECIMIENTO</span>
        <h1>Panel administrativo</h1>
        <p class="muted">Organiza profesionales, agenda, disponibilidad y bloqueos.</p>
      </div>
    </div>

    <div class="stats">
      <article><span>Pacientes<strong>{{summary.patients || 0}}</strong></span></article>
      <article><span>Médicos activos<strong>{{summary.doctors || 0}}</strong></span></article>
      <article><span>Citas reservadas<strong>{{summary.appointments || 0}}</strong></span></article>
    </div>

    <div class="chips">
      @for(t of tabs; track t) {
        <button [class.selected]="tab===t" (click)="selectTab(t)">{{t}}</button>
      }
    </div>
    @if(error){<div class="alert error" role="alert">{{error}}</div>}
    @if(success){<div class="alert success">{{success}}</div>}

    <section class="panel">
      @if(tab==='Agenda') {
        <div class="toolbar">
          <div><h2>Agenda general</h2><small class="muted">Citas registradas en todos los establecimientos</small></div>
          <button class="secondary" [disabled]="agendaLoading" (click)="loadAgenda()">{{agendaLoading?'Actualizando…':'↻ Actualizar'}}</button>
        </div>
        <div class="admin-filter-grid">
          <label>Fecha de atención<input type="date" [(ngModel)]="date"></label>
          <label>Estado
            <select [(ngModel)]="status">
              <option value="">Todos los estados</option>
              @for(s of statuses; track s){<option [value]="s">{{statusLabel(s)}}</option>}
            </select>
          </label>
          <label>Médico
            <select [(ngModel)]="filterDoctor"><option [ngValue]="0">Todos los médicos</option>@for(d of doctors;track d.id){<option [ngValue]="d.id">{{d.name}}</option>}</select>
          </label>
          <label>Especialidad
            <select [(ngModel)]="filterSpecialty"><option [ngValue]="0">Todas las especialidades</option>@for(s of specialties;track s.id){<option [ngValue]="s.id">{{s.name}}</option>}</select>
          </label>
          <label>Sede
            <select [(ngModel)]="filterFacility"><option value="">Todas las sedes</option>@for(f of facilities;track f.code){<option [value]="f.code">{{f.name}}</option>}</select>
          </label>
        </div>
        <div class="admin-actions">
          <button class="primary" [disabled]="agendaLoading" (click)="applyAgendaFilters()">Aplicar filtros</button>
          <button class="secondary" [disabled]="agendaLoading" (click)="clearAgendaFilters()">Limpiar filtros</button>
          <span class="muted">{{appointments.length}} citas en esta página</span>
        </div>
        @if(agendaLoading){<div class="empty"><p>Cargando agenda general…</p></div>}
        <div class="table-wrap">
          <table>
            <thead><tr><th>Fecha y hora</th><th>Paciente</th><th>Médico</th><th>Especialidad</th><th>Sede</th><th>Estado</th></tr></thead>
            <tbody>
              @for(a of appointments;track a.id){
                <tr>
                  <td>{{a.starts_at|date:'dd/MM/yyyy HH:mm':'-0500'}}</td>
                  <td>{{a.patient}}</td><td>{{a.doctor}}</td><td>{{a.specialty}}</td><td>{{a.facility}}</td>
                  <td><span class="badge" [class.cancelled]="a.status==='CANCELADA'">{{statusLabel(a.status)}}</span></td>
                </tr>
              } @empty {
                @if(!agendaLoading){<tr><td colspan="6">No se encontraron citas con los filtros seleccionados. Si todavía no se registraron reservas, esta agenda aparecerá vacía.</td></tr>}
              }
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <button class="secondary" [disabled]="page===0 || agendaLoading" (click)="previousAgendaPage()">Anterior</button>
          <span>Página {{page+1}}</span>
          <button class="secondary" [disabled]="appointments.length<50 || agendaLoading" (click)="nextAgendaPage()">Siguiente</button>
        </div>
      }

      @if(tab==='Médicos') {
        <h2>Registrar profesional</h2>
        <form class="form-grid" (ngSubmit)="createDoctor()">
          <label>Nombre<input name="name" [(ngModel)]="doctor.name" required minlength="2" maxlength="100"></label>
          <label>DNI ficticio<input name="dni" [(ngModel)]="doctor.dni" required pattern="[0-9]{8}" minlength="8" maxlength="8" inputmode="numeric"></label>
          <label>Correo<input name="email" type="email" [(ngModel)]="doctor.email" required maxlength="150"></label>
          <label>Contraseña inicial<input name="password" type="password" [(ngModel)]="doctor.password" required minlength="8" maxlength="64"></label>
          <label>Especialidad<select name="specialty" [(ngModel)]="doctor.specialtyId" required>@for(s of specialties;track s.id){<option [ngValue]="s.id">{{s.name}}</option>}</select></label>
          <label>Sede de atención<select name="facilityCode" [(ngModel)]="doctor.facilityCode" required>@for(f of facilities;track f.code){<option [value]="f.code">{{f.name}}</option>}</select></label>
          <button class="primary" [disabled]="busy || !facilities.length">Registrar médico</button>
        </form>
        <div class="table-wrap"><table><thead><tr><th>Profesional</th><th>Especialidad</th><th>Sede de atención</th><th>Activo</th><th>Acción</th></tr></thead><tbody>
          @for(d of doctors;track d.id){<tr><td><input [(ngModel)]="d.name" required minlength="2" maxlength="100" aria-label="Nombre del médico"></td><td><select [(ngModel)]="d.specialty_id" aria-label="Especialidad">@for(s of specialties;track s.id){<option [ngValue]="s.id">{{s.name}}</option>}</select></td><td><select [(ngModel)]="d.facility_code" aria-label="Sede del médico">@for(f of facilities;track f.code){<option [value]="f.code">{{f.name}}</option>}</select></td><td><input type="checkbox" [(ngModel)]="d.active" aria-label="Médico activo"></td><td><button class="secondary" [disabled]="busy" (click)="saveDoctor(d)">Guardar</button></td></tr>}
          @empty{<tr><td colspan="5">No hay médicos registrados todavía. Completa el formulario para agregar uno.</td></tr>}
        </tbody></table></div>
      }

      @if(tab==='Especialidades') {
        <h2>Catálogo de especialidades</h2>
        <form class="inline-form" (ngSubmit)="createSpecialty()"><label>Nueva especialidad<input name="specialtyName" [(ngModel)]="specialtyName" required minlength="2" maxlength="100"></label><button class="primary" [disabled]="busy">Agregar</button></form>
        <div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Activa</th><th>Reserva directa</th><th>Acción</th></tr></thead><tbody>
          @for(s of specialties;track s.id){<tr><td><input [(ngModel)]="s.name" required minlength="2" maxlength="100" aria-label="Nombre de especialidad"></td><td><input type="checkbox" [(ngModel)]="s.active" aria-label="Especialidad activa"></td><td><input type="checkbox" [(ngModel)]="s.direct" aria-label="Reserva directa"></td><td><button class="secondary" [disabled]="busy" (click)="saveSpecialty(s)">Guardar</button></td></tr>}
        </tbody></table></div>
      }

      @if(tab==='Horarios') {
        <h2>Publicar disponibilidad</h2>
        <p class="muted">Crea turnos disponibles para que los pacientes puedan reservarlos.</p>
        <form class="form-grid" (ngSubmit)="createSlot()">
          <label>Médico<select name="doctorId" [(ngModel)]="slotDoctor" required>@for(d of doctors;track d.id){<option [ngValue]="d.id">{{d.name}} · {{d.specialty}}</option>}</select></label>
          <label>Inicio<input type="datetime-local" name="start" [(ngModel)]="start" [min]="minDateTime" required></label>
          <label>Fin<input type="datetime-local" name="end" [(ngModel)]="end" [min]="start || minDateTime" required></label>
          <button class="primary" [disabled]="busy || !doctors.length">Crear horario</button>
        </form>

        <div class="divider-title"><h2>Bloquear un rango de atención</h2><span class="muted">También funciona aunque todavía no existan turnos publicados.</span></div>
        <form class="form-grid" (ngSubmit)="createBlock()">
          <label>Médico<select name="blockDoctor" [(ngModel)]="blockDoctor" required>@for(d of doctors;track d.id){<option [ngValue]="d.id">{{d.name}} · {{d.specialty}}</option>}</select></label>
          <label>Desde<input type="datetime-local" name="blockStart" [(ngModel)]="blockStart" [min]="minDateTime" required></label>
          <label>Hasta<input type="datetime-local" name="blockEnd" [(ngModel)]="blockEnd" [min]="blockStart || minDateTime" required></label>
          <label class="admin-wide">Motivo del bloqueo<input name="blockReason" [(ngModel)]="blockReason" required minlength="3" maxlength="250" placeholder="Ej. Reunión médica, vacaciones, mantenimiento"></label>
          <button class="primary" [disabled]="busy || !doctors.length">Guardar bloqueo</button>
        </form>

        <div class="divider-title"><h2>Bloqueos de agenda</h2><span class="muted">Puedes reactivar la disponibilidad desactivando un bloqueo.</span></div>
        <div class="table-wrap"><table><thead><tr><th>Médico</th><th>Inicio</th><th>Fin</th><th>Motivo</th><th>Estado</th><th>Acción</th></tr></thead><tbody>
          @for(b of blocks;track b.id){<tr><td>{{b.doctor}}</td><td>{{b.starts_at|date:'dd/MM/yyyy HH:mm':'-0500'}}</td><td>{{b.ends_at|date:'dd/MM/yyyy HH:mm':'-0500'}}</td><td>{{b.reason}}</td><td>{{b.active?'Bloqueo activo':'Desactivado'}}</td><td><button class="secondary" [disabled]="busy" (click)="toggleBlock(b)">{{b.active?'Desactivar':'Reactivar'}}</button></td></tr>}
          @empty{<tr><td colspan="6">No hay bloqueos de agenda registrados.</td></tr>}
        </tbody></table></div>

        <div class="divider-title"><h2>Horarios individuales</h2><span class="muted">Bloquea o habilita un turno puntual.</span></div>
        <label class="single-block-reason">Motivo para bloquear un turno individual<input [(ngModel)]="slotBlockReason" maxlength="250" placeholder="Ej. Ausencia del profesional"></label>
        <div class="table-wrap"><table><thead><tr><th>Médico</th><th>Especialidad</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Paciente</th><th>Acción</th></tr></thead><tbody>
          @for(s of slots;track s.id){
            <tr><td>{{s.doctor}}</td><td>{{s.specialty}}</td><td>{{s.starts_at|date:'dd/MM/yyyy HH:mm':'-0500'}}</td><td>{{s.ends_at|date:'HH:mm':'-0500'}}</td>
              <td>{{slotStatus(s)}} @if(s.block_reason || s.range_block_reason){<small class="block-reason-note">{{s.block_reason || s.range_block_reason}}</small>}</td><td>{{s.patient || '—'}}</td>
              <td><button class="secondary" [disabled]="busy || (s.appointment_status && s.appointment_status!=='DISPONIBLE') || s.range_blocked" (click)="toggleSlot(s)">{{s.blocked?'Habilitar':'Bloquear'}}</button></td>
            </tr>
          }
          @empty{<tr><td colspan="7">No hay horarios futuros registrados. Publica un horario para comenzar.</td></tr>}
        </tbody></table></div>
      }

      @if(tab==='Cobertura demo') {
        <h2>Simulador de cobertura</h2><div class="hint">Modifica únicamente condiciones ficticias. Los pacientes no pueden cambiar su cobertura.</div>
        <div class="table-wrap"><table><thead><tr><th>Paciente</th><th>DNI demo</th><th>Estado</th><th>Vigencia</th><th>Acción</th></tr></thead><tbody>
          @for(p of patients;track p.id){<tr><td>{{p.name}}</td><td>{{p.dni}}</td><td><select [(ngModel)]="p.coverage" aria-label="Estado de cobertura"><option>VIGENTE</option><option>VENCIDA</option><option>NO_VERIFICABLE</option></select></td><td><input type="date" [(ngModel)]="p.coverage_until" aria-label="Fin de cobertura"></td><td><button class="secondary" [disabled]="busy" (click)="saveCoverage(p)">Guardar</button></td></tr>}
        </tbody></table></div>
      }

      @if(tab==='Auditoría') {
        <h2>Trazabilidad de citas</h2><div class="table-wrap"><table><thead><tr><th>Evento</th><th>Cita</th><th>Actor</th><th>Acción</th><th>Fecha (Perú)</th></tr></thead><tbody>
          @for(a of audit;track a.id){<tr><td>{{a.id}}</td><td>#{{a.appointment_id}}</td><td>{{a.actor}}</td><td>{{a.action}}</td><td>{{a.created_at|date:'dd/MM/yyyy HH:mm':'-0500'}}</td></tr>}
          @empty{<tr><td colspan="5">Aún no se registran operaciones de citas.</td></tr>}
        </tbody></table></div>
      }
    </section>
  `
})
export class Admin implements OnInit {
  api = inject(Api);
  tabs = ['Agenda', 'Médicos', 'Especialidades', 'Horarios', 'Cobertura demo', 'Auditoría'];
  statuses = ['RESERVADA', 'CANCELADA', 'ATENDIDA', 'NO_ASISTIO'];
  tab = 'Agenda';
  error = '';
  success = '';
  busy = false;
  agendaLoading = false;
  summary: any = {};
  doctors: Doctor[] = [];
  specialties: Specialty[] = [];
  facilities: Facility[] = [];
  slots: Slot[] = [];
  blocks: ScheduleBlock[] = [];
  patients: any[] = [];
  audit: any[] = [];
  appointments: Appointment[] = [];
  date = '';
  status = '';
  filterDoctor = 0;
  filterSpecialty = 0;
  filterFacility = '';
  page = 0;
  specialtyName = '';
  doctor = { name: '', dni: '', email: '', password: '', specialtyId: 1, facilityCode: 'LIMA-REBA' };
  slotDoctor = 1;
  start = '';
  end = '';
  blockDoctor = 1;
  blockStart = '';
  blockEnd = '';
  blockReason = '';
  slotBlockReason = 'Bloqueo administrativo';

  get minDateTime() {
    const local = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  private validName(value: string) {
    const name = value.trim().replace(/\s+/g, ' ');
    return name.length >= 2 && name.length <= 100
      && /^[\p{L}][\p{L}\p{M} .'-]{1,99}$/u.test(name);
  }

  private validRange(start: string, end: string) {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    return !!start && !!end && Number.isFinite(startTime) && Number.isFinite(endTime)
      && startTime > Date.now() && endTime > startTime;
  }

  ngOnInit() {
    this.load();
    this.api.get<Facility[]>('/facilities').subscribe({
      next: rows => {
        this.facilities = rows;
        if (!this.facilities.some(f => f.code === this.doctor.facilityCode)) this.doctor.facilityCode = this.facilities[0]?.code || '';
      },
      error: e => this.error = message(e)
    });
  }

  selectTab(tab: string) {
    this.tab = tab;
    this.error = '';
    this.success = '';
    if (tab === 'Agenda') this.loadAgenda();
    if (tab === 'Horarios') this.loadSchedules();
  }

  load() {
    this.read<any>('/summary', r => this.summary = r);
    this.read<Doctor[]>('/doctors', r => {
      this.doctors = r;
      if (r.length && !r.some(d => d.id === this.slotDoctor)) this.slotDoctor = r[0].id;
      if (r.length && !r.some(d => d.id === this.blockDoctor)) this.blockDoctor = r[0].id;
    });
    this.read<Specialty[]>('/specialties', r => this.specialties = r);
    this.read<any[]>('/patients', r => this.patients = r);
    this.read<any[]>('/audit', r => this.audit = r);
    this.loadAgenda();
    this.loadSchedules();
  }

  read<T>(path: string, apply: (rows: T) => void) {
    this.api.get<T>('/admin' + path).subscribe({
      next: apply,
      error: e => this.error = message(e)
    });
  }

  loadAgenda() {
    this.agendaLoading = true;
    const query = [
      'page=' + this.page,
      'date=' + encodeURIComponent(this.date),
      'status=' + encodeURIComponent(this.status),
      'doctorId=' + this.filterDoctor,
      'specialtyId=' + this.filterSpecialty,
      'facilityCode=' + encodeURIComponent(this.filterFacility)
    ].join('&');
    this.api.get<Appointment[]>('/admin/appointments?' + query).subscribe({
      next: rows => { this.appointments = rows; this.agendaLoading = false; },
      error: e => { this.agendaLoading = false; this.error = message(e); }
    });
  }

  applyAgendaFilters() {
    this.page = 0;
    this.loadAgenda();
  }

  previousAgendaPage() {
    if (this.page > 0 && !this.agendaLoading) {
      this.page -= 1;
      this.loadAgenda();
    }
  }

  nextAgendaPage() {
    if (this.appointments.length >= 50 && !this.agendaLoading) {
      this.page += 1;
      this.loadAgenda();
    }
  }

  clearAgendaFilters() {
    this.date = '';
    this.status = '';
    this.filterDoctor = 0;
    this.filterSpecialty = 0;
    this.filterFacility = '';
    this.page = 0;
    this.loadAgenda();
  }

  loadSchedules() {
    this.read<Slot[]>('/slots', rows => this.slots = rows);
    this.read<ScheduleBlock[]>('/blocks', rows => this.blocks = rows);
  }

  statusLabel(status: string) {
    const labels: Record<string, string> = {
      RESERVADA: 'Reservada', CANCELADA: 'Cancelada', ATENDIDA: 'Atendida', NO_ASISTIO: 'No asistió'
    };
    return labels[status] || status;
  }

  slotStatus(slot: Slot) {
    if (slot.appointment_status === 'RESERVADA') return 'Ocupado';
    if (slot.range_blocked) return 'Bloqueado por rango';
    if (slot.blocked) return 'Bloqueado';
    return 'Disponible';
  }

  write(method: 'post' | 'put' | 'patch', path: string, data: unknown) {
    if (this.busy) return;
    this.busy = true;
    this.error = '';
    this.success = '';
    this.api[method]('/admin' + path, data).subscribe({
      next: () => {
        this.busy = false;
        this.success = 'Cambios guardados correctamente.';
        this.load();
      },
      error: e => { this.busy = false; this.error = message(e); }
    });
  }

  createDoctor() {
    const name = this.doctor.name.trim().replace(/\s+/g, ' ');
    const dni = this.doctor.dni.trim();
    const email = this.doctor.email.trim().toLowerCase();
    if (!this.validName(name)) { this.error = 'Ingresa un nombre válido de entre 2 y 100 caracteres.'; return; }
    if (!/^\d{8}$/.test(dni)) { this.error = 'El DNI debe contener exactamente 8 dígitos.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 150) { this.error = 'Ingresa un correo electrónico válido.'; return; }
    if (this.doctor.password.length < 8 || this.doctor.password.length > 64 || !this.doctor.password.trim()) { this.error = 'La contraseña inicial debe tener entre 8 y 64 caracteres.'; return; }
    this.write('post', '/doctors', { ...this.doctor, name, dni, email });
  }
  saveDoctor(d: Doctor) {
    const name = d.name.trim().replace(/\s+/g, ' ');
    if (!this.validName(name)) { this.error = 'El nombre del profesional debe tener entre 2 y 100 caracteres.'; return; }
    this.write('put', '/doctors/' + d.id, {
      name, specialtyId: d.specialty_id, facilityCode: d.facility_code, active: d.active
    });
  }
  createSpecialty() {
    const name = this.specialtyName.trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 100 || !/^[\p{L}][\p{L}\p{M}0-9 .&/+()'-]{1,99}$/u.test(name)) {
      this.error = 'Ingresa un nombre de especialidad válido de entre 2 y 100 caracteres.';
      return;
    }
    this.write('post', '/specialties', { name, active: true, direct: true });
    this.specialtyName = '';
  }
  saveSpecialty(s: Specialty) {
    const name = s.name.trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 100 || !/^[\p{L}][\p{L}\p{M}0-9 .&/+()'-]{1,99}$/u.test(name)) {
      this.error = 'El nombre de la especialidad no es válido.';
      return;
    }
    this.write('put', '/specialties/' + s.id, { ...s, name });
  }
  private localOffset(value: string) { return value ? value + ':00-05:00' : ''; }
  createSlot() {
    if (!this.validRange(this.start, this.end)) {
      this.error = 'El inicio del horario debe ser futuro y la hora final debe ser posterior.';
      return;
    }
    this.write('post', '/slots', {
      doctorId: this.slotDoctor, startsAt: this.localOffset(this.start), endsAt: this.localOffset(this.end)
    });
  }
  toggleSlot(slot: Slot) {
    const reason = slot.blocked ? '' : this.slotBlockReason.trim();
    this.write('patch', '/slots/' + slot.id, { blocked: !slot.blocked, reason });
  }
  createBlock() {
    if (!this.validRange(this.blockStart, this.blockEnd)) {
      this.error = 'El bloqueo debe iniciar en el futuro y terminar después de su hora de inicio.';
      return;
    }
    if (this.blockReason.trim().length < 3 || this.blockReason.trim().length > 250) {
      this.error = 'El motivo del bloqueo debe tener entre 3 y 250 caracteres.';
      return;
    }
    this.write('post', '/blocks', {
      doctorId: this.blockDoctor,
      startsAt: this.localOffset(this.blockStart),
      endsAt: this.localOffset(this.blockEnd),
      reason: this.blockReason.trim()
    });
  }
  toggleBlock(block: ScheduleBlock) {
    this.write('patch', '/blocks/' + block.id, { active: !block.active });
  }
  saveCoverage(patient: any) {
    if (!patient.coverage_until) {
      this.error = 'Selecciona la fecha de vencimiento de la cobertura demo.';
      return;
    }
    const until = new Date(patient.coverage_until + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (patient.coverage === 'VIGENTE' && until < today) {
      this.error = 'Una cobertura vigente debe tener una fecha igual o posterior a hoy.';
      return;
    }
    if (patient.coverage === 'VENCIDA' && until >= today) {
      this.error = 'Una cobertura vencida debe tener una fecha anterior a hoy.';
      return;
    }
    this.write('patch', '/patients/' + patient.id, { coverage: patient.coverage, until: patient.coverage_until });
  }
}
