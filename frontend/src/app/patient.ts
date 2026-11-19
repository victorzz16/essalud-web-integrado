import { downloadReceipt, downloadCalendar } from './appointment-export';
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api, Profile, Doctor, Slot, Appointment, Specialty, Facility, message } from './api';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-heading">
      <div><span class="eyebrow">MI ESPACIO DE SALUD</span><h1>Hola, {{api.session()?.name?.split(' ')?.[0]}} <span class="wave">✦</span></h1><p class="muted">Todo lo que necesitas para organizar tu atención.</p></div>
      <span class="tag">● Demostración académica</span>
    </div>
    @if(error){<div class="alert error">{{error}}</div>}
    <section class="hero">
      <div><span class="eyebrow light">CUIDARTE EMPIEZA AQUÍ</span><h2>Tu salud merece<br>un espacio en tu agenda.</h2><p>Encuentra un horario disponible y confirma tu próxima atención.</p><a class="white-button" [routerLink]="api.session()?.role==='PACIENTE'?'/reservar':api.session()?.role==='MEDICO'?'/agenda':'/admin'">{{api.session()?.role==='PACIENTE'?'Reservar una cita':'Abrir mi panel'}} <span>↗</span></a></div>
      <div class="hero-art"><div class="medical-cross">✚</div><div class="float-card">✓ <span>Un lugar para tu bienestar<small>Consulta externa · Proyecto demo</small></span></div></div>
    </section>
    @if(profile){
      <div class="stats">
        <article><span class="stat-icon">⌂</span><span>Sede de referencia<strong>{{profile.facility}}</strong><small>Catálogo referencial</small></span></article>
        <article><span class="stat-icon">✓</span><span>Cobertura simulada<strong>{{profile.coverage}}</strong><small>Hasta {{profile.coverage_until | date:'dd/MM/yyyy'}}</small></span></article>
        <article><span class="stat-icon">▦</span><span>Tu perfil<strong>{{profile.role}}</strong><small>Acceso personal</small></span></article>
      </div>
    }
    <div class="section-title"><h2>Una atención más sencilla</h2><span class="muted">En tres pasos</span></div>
    <div class="steps-cards">
      <article><span>01</span><h3>Elige la especialidad</h3><p>Explora profesionales y selecciona el establecimiento para tu atención.</p></article>
      <article><span>02</span><h3>Encuentra tu horario</h3><p>Selecciona un turno disponible que encaje con tu agenda.</p></article>
      <article><span>03</span><h3>Confirma tu cita</h3><p>Revisa los datos y encuentra el resultado en Mis citas y Calendario.</p></article>
    </div>
  `
})
export class Dashboard implements OnInit {
  api = inject(Api);
  profile?: Profile;
  error = '';
  ngOnInit() {
    this.api.get<Profile>('/me').subscribe({
      next: profile => this.profile = profile,
      error: e => this.error = message(e)
    });
  }
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-heading booking-heading">
      <div><span class="eyebrow">CONSULTA EXTERNA</span><h1>Especialistas</h1><p class="muted">Encuentra un profesional y reserva un horario disponible.</p></div>
      <span class="tag">Atención presencial</span>
    </div>
    @if(error){<div class="alert error" role="alert">{{error}}</div>}
    @if(done){
      <section class="panel success-panel"><div class="big-check">✓</div><h2>¡Tu cita quedó reservada!</h2><p>Comprobante N.° {{done}} · Consulta el detalle en tu historial.</p><a routerLink="/mis-citas" class="primary">Ver mis citas →</a></section>
    } @else {
      <section class="booking-search-panel">
        <div class="booking-search-field"><span>⌕</span><input [(ngModel)]="searchTerm" (keyup.enter)="applySearch()" placeholder="Doctor, especialidad o síntoma" aria-label="Buscar médico o especialidad"></div>
        <button class="primary booking-search-button" type="button" (click)="applySearch()">Buscar</button>
        <div class="booking-search-count">{{filtered.length}} profesionales</div>
      </section>
      <div class="booking-layout">
        <aside class="booking-filters">
          <span class="eyebrow">FILTROS</span>
          <label>Establecimiento
            <select [(ngModel)]="facilityCode" (ngModelChange)="loadDoctors()">
              <option value="">Todas las sedes · Todos los médicos</option>
              @for(facility of facilities;track facility.code){<option [value]="facility.code">{{facility.name}}</option>}
            </select>
          </label>
          <div class="filter-divider"></div>
          <label>Especialidad
            <select [(ngModel)]="specialty">
              <option [ngValue]="0">Todas las especialidades</option>
              @for(s of specialties;track s.id){<option [ngValue]="s.id">{{s.name}}</option>}
            </select>
          </label>
          <label>Médico
            <select [(ngModel)]="doctorFilterId">
              <option [ngValue]="0">Todos los médicos</option>
              @for(d of doctors;track d.id){<option [ngValue]="d.id">{{d.name}}</option>}
            </select>
          </label>
          @if(selectedFacility){
            <div class="selected-facility-note"><span>SEDE SELECCIONADA</span><strong>{{selectedFacility.name}}</strong><small>{{selectedFacility.district}}, {{selectedFacility.region}}</small></div>
          } @else {
            <div class="selected-facility-note"><span>FILTRO GENERAL</span><strong>Todos los establecimientos</strong><small>Se muestran los médicos activos de todas las sedes.</small></div>
          }
          <p class="filter-disclaimer">Los establecimientos, profesionales y horarios mostrados son referenciales para esta demostración.</p>
        </aside>
        <section class="specialist-results">
          <div class="results-toolbar"><strong>{{filtered.length}} {{filtered.length===1?'especialista':'especialistas'}}</strong><span class="muted">Ordenados alfabéticamente</span></div>
          @if(loading){<div class="panel empty"><span>◌</span><p>Cargando profesionales…</p></div>}
          @for(d of filtered;track d.id){
            <article class="specialist-card">
              <div class="doctor-avatar specialist-avatar">{{initials(d.name)}}</div>
              <div class="specialist-info">
                <h3>{{d.name}}</h3>
                <p class="specialist-specialty">{{d.specialty}}</p>
                <p class="specialist-meta"><span>◷</span> Consulta externa · Atención presencial</p>
                <p class="specialist-meta"><span>⌖</span> {{d.facility}}</p>
                <p class="specialist-meta"><span>▦</span> {{d.available_slots || 0}} horarios disponibles</p>
                @if(d.next_available){<small>Próximo horario: {{d.next_available|date:'dd/MM/yyyy HH:mm':'-0500'}} h</small>}
                @else {<small>No tiene horarios publicados por el momento.</small>}
              </div>
              <div class="specialist-action"><button class="primary" (click)="selectDoctor(d)">Ver horarios y reservar</button></div>
            </article>
          } @empty {
            @if(!loading){<div class="panel empty"><span>⌕</span><h3>No encontramos especialistas</h3><p>Prueba con otra búsqueda o especialidad. Si no aparecen profesionales, selecciona otra sede o pide al administrador que asigne médicos a este establecimiento.</p></div>}
          }
        </section>
      </div>
      @if(step>1 && doctor){
        <div class="modal-backdrop booking-modal-backdrop">
          <section class="modal booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-step-title">
            <button class="booking-close" type="button" aria-label="Cerrar" (click)="closeBooking()">×</button>
            @if(step===2){
              <span class="eyebrow">SELECCIÓN DE HORARIO</span><h2 id="booking-step-title">{{doctor.name}}</h2>
              <p class="muted">{{doctor.specialty}} · {{doctor.facility}}</p>
              <label class="date-input">Elige una fecha<select [(ngModel)]="day"><option value="">Selecciona una fecha</option>@for(d of days;track d){<option [value]="d">{{d}}</option>}</select></label>
              <div class="time-grid">@for(s of daySlots;track s.id){<button type="button" (click)="slot=s;step=3">{{s.starts_at|date:'HH:mm':'-0500'}} – {{s.ends_at|date:'HH:mm':'-0500'}}</button>}</div>
              @if(!slots.length){<div class="empty">{{loading?'Cargando horarios…':'No hay horarios disponibles. Prueba con otro profesional.'}}</div>}
            }
            @if(step===3){
              <span class="eyebrow">CONFIRMA TU RESERVA</span><h2 id="booking-step-title">Revisa los datos de tu cita</h2>
              <div class="confirmation booking-confirmation">
                <div><small>PROFESIONAL</small><h3>{{doctor.name}}</h3><p>{{doctor.specialty}}</p></div>
                <div><small>ESTABLECIMIENTO</small><h3>{{doctor.facility}}</h3><p>Atención presencial</p></div>
                <div><small>FECHA</small><h3>{{slot?.starts_at|date:'dd/MM/yyyy':'-0500'}}</h3><p>{{slot?.starts_at|date:'HH:mm':'-0500'}} h · Perú</p></div>
              </div>
              <div class="hint">La cobertura simulada y el cupo se validarán al confirmar. La reserva solo queda registrada cuando el servidor la confirma.</div>
              <div class="actions"><button class="secondary" type="button" (click)="step=2">Cambiar horario</button><button class="primary" [disabled]="busy" (click)="reserve()">{{busy?'Confirmando…':'Confirmar mi cita'}} →</button></div>
            }
          </section>
        </div>
      }
    }
  `
})
export class Booking implements OnInit {
  api = inject(Api);
  step = 1;
  specialty = 0;
  doctorFilterId = 0;
  specialties: Specialty[] = [];
  facilities: Facility[] = [];
  doctors: Doctor[] = [];
  slots: Slot[] = [];
  doctor?: Doctor;
  slot?: Slot;
  day = '';
  facilityCode = '';
  searchTerm = '';
  error = '';
  loading = false;
  busy = false;
  done = 0;

  ngOnInit() {
    this.loading = true;
    this.facilityCode = '';
    this.api.get<Specialty[]>('/specialties').subscribe({
      next: specialties => this.specialties = specialties,
      error: e => this.error = message(e)
    });
    this.api.get<Facility[]>('/facilities').subscribe({
      next: facilities => this.facilities = facilities,
      error: e => this.error = message(e)
    });
    // La búsqueda inicia mostrando todos los profesionales de todas las sedes.
    this.loadDoctors();
  }

  get selectedFacility() { return this.facilities.find(f => f.code === this.facilityCode); }
  get filtered() {
    const normalize = (value: string) => value.toLocaleLowerCase('es-PE').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const query = normalize(this.searchTerm.trim());
    const symptomMatches: Array<{ terms: string[]; specialties: string[] }> = [
      { terms: ['dolor de cabeza', 'migraña', 'cefalea'], specialties: ['Neurología', 'Medicina general'] },
      { terms: ['fiebre', 'gripe', 'malestar'], specialties: ['Medicina general', 'Medicina interna', 'Pediatría'] },
      { terms: ['tos', 'asma', 'falta de aire'], specialties: ['Neumología', 'Medicina general'] },
      { terms: ['dolor de pecho', 'palpitaciones'], specialties: ['Cardiología'] },
      { terms: ['acné', 'manchas', 'picazón', 'erupción'], specialties: ['Dermatología'] },
      { terms: ['dolor abdominal', 'gastritis', 'reflujo'], specialties: ['Gastroenterología'] },
      { terms: ['embarazo', 'menstruación', 'control prenatal'], specialties: ['Ginecología y obstetricia', 'Obstetricia'] },
      { terms: ['ansiedad', 'depresión', 'insomnio', 'estrés'], specialties: ['Psicología', 'Psiquiatría'] },
      { terms: ['dolor articular', 'articulaciones'], specialties: ['Reumatología'] },
      { terms: ['dolor de espalda', 'huesos', 'fractura'], specialties: ['Traumatología y ortopedia'] },
      { terms: ['visión', 'ojos', 'vista borrosa'], specialties: ['Oftalmología'] },
      { terms: ['oído', 'garganta', 'nariz'], specialties: ['Otorrinolaringología'] },
      { terms: ['riñón', 'orina'], specialties: ['Nefrología', 'Urología'] },
      { terms: ['peso', 'alimentación', 'nutrición'], specialties: ['Nutrición'] }
    ];
    const matchingSpecialties = symptomMatches
      .filter(item => item.terms.some(term => normalize(term).includes(query) || query.includes(normalize(term))))
      .flatMap(item => item.specialties);
    return this.doctors.filter(doctor => {
      const matchesName = normalize(`${doctor.name} ${doctor.specialty}`).includes(query);
      const matchesSymptom = matchingSpecialties.includes(doctor.specialty);
      return (!this.specialty || doctor.specialty_id === this.specialty)
        && (!this.doctorFilterId || doctor.id === this.doctorFilterId)
        && (!query || matchesName || matchesSymptom);
    });
  }

  applySearch() { this.searchTerm = this.searchTerm.trim(); }

  initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0,2).map(part => part[0]).join('').toUpperCase(); }

  loadDoctors() {
    this.loading = true;
    this.error = '';
    this.doctors = [];
    const path = this.facilityCode
      ? '/doctors?facilityCode=' + encodeURIComponent(this.facilityCode)
      : '/doctors';
    this.api.get<Doctor[]>(path).subscribe({
      next: doctors => {
        this.doctors = doctors || [];
        if (this.doctorFilterId && !this.doctors.some(d => d.id === this.doctorFilterId)) this.doctorFilterId = 0;
        this.loading = false;
      },
      error: e => { this.error = message(e); this.loading = false; }
    });
  }

  localDay(slot: Slot) { return new Date(new Date(slot.starts_at).getTime() - 5 * 3600000).toISOString().slice(0,10); }
  get days() { return [...new Set(this.slots.map(slot => this.localDay(slot)))]; }
  get daySlots() { return this.slots.filter(slot => this.localDay(slot) === this.day); }

  selectDoctor(doctor: Doctor) {
    this.doctor = doctor;
    this.step = 2;
    this.slot = undefined;
    this.slots = [];
    this.day = '';
    this.error = '';
    this.loading = true;
    this.api.get<Slot[]>('/slots?doctorId=' + doctor.id).subscribe({
      next: slots => { this.slots = slots; this.day = this.days[0] || ''; this.loading = false; },
      error: e => { this.error = message(e); this.loading = false; }
    });
  }

  closeBooking() { this.step = 1; this.doctor = undefined; this.slot = undefined; this.slots = []; }

  reserve() {
    if (!this.slot || this.busy) return;
    this.busy = true;
    this.error = '';
    this.api.post<{id:number}>('/appointments', { slotId: this.slot.id }).subscribe({
      next: appointment => { this.done = appointment.id; this.busy = false; this.step = 1; },
      error: e => {
        this.busy = false;
        if (e.status === 409 && this.doctor) this.selectDoctor(this.doctor);
        this.error = message(e);
      }
    });
  }
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-heading"><div><span class="eyebrow">TU AGENDA</span><h1>{{medical?'Agenda de atención':'Mis citas médicas'}}</h1><p class="muted">{{medical?'Consulta tus pacientes y registra el estado de atención.':'Revisa tus próximas atenciones y tu historial.'}}</p></div>@if(!medical){<a class="primary" routerLink="/reservar">＋ Nueva cita</a>}</div>
    @if(error){<div class="alert error" role="alert">{{error}}</div>}
    @if(success){<div class="alert success">{{success}}</div>}
    <section class="panel">
      <div class="toolbar"><h2>{{medical?'Atenciones programadas':'Historial de citas'}}</h2><select [(ngModel)]="filter"><option value="">Todos los estados</option>@for(s of ['RESERVADA','CANCELADA','ATENDIDA','NO_ASISTIO'];track s){<option>{{s}}</option>}</select></div>
      @for(a of filtered;track a.id){
        <article class="appointment" [class.print-target]="printId===a.id">
          <div class="date-tile"><b>{{a.starts_at|date:'dd':'-0500'}}</b><span>{{a.starts_at|date:'MM/yyyy':'-0500'}}</span></div>
          <div class="appointment-info"><span class="badge" [class.cancelled]="a.status==='CANCELADA'">{{a.status}}</span><h3>{{a.specialty}}</h3><p>{{medical?a.patient:a.doctor}} · {{a.starts_at|date:'HH:mm':'-0500'}} h</p><small>📍 {{a.facility}}</small><small>Comprobante #{{a.id}}</small></div>
          @if(a.status==='RESERVADA'){@if(medical){<button class="secondary" [disabled]="busy" (click)="change(a,'ATENDIDA')">Atendida</button><button class="text-button" [disabled]="busy" (click)="change(a,'NO_ASISTIO')">No asistió</button>}@else{<button class="danger-text" [disabled]="busy" (click)="pending=a">Cancelar cita</button>}}
          <div class="appointment-actions"><button class="text-button" (click)="print(a)">Imprimir</button><button class="secondary" (click)="download(a)">Descargar PDF</button>@if(upcoming(a)){<button class="text-button" (click)="calendar(a)">Agregar al calendario</button>}</div>
        </article>
      } @empty {
        <div class="empty"><span>▦</span><h3>{{loading?'Cargando citas…':'No hay citas para mostrar'}}</h3><p>Las reservas confirmadas aparecerán aquí.</p></div>
      }
    </section>
    @if(pending){<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="cancel-title"><h2 id="cancel-title">¿Cancelar esta cita?</h2><p>{{pending.specialty}} · {{pending.starts_at|date:'dd/MM/yyyy HH:mm':'-0500'}}</p><p class="muted">El horario volverá a estar disponible. El servidor comprobará el plazo de cancelación.</p><div class="actions"><button class="secondary" (click)="pending=undefined">Conservar cita</button><button class="primary" [disabled]="busy" (click)="change(pending,'CANCELADA')">Confirmar cancelación</button></div></section></div>}
  `
})
export class Appointments implements OnInit {
  api = inject(Api);
  rows: Appointment[] = [];
  filter = '';
  error = '';
  success = '';
  loading = false;
  busy = false;
  pending?: Appointment;
  printId: number | null = null;
  get medical() { return this.api.session()?.role === 'MEDICO'; }
  get filtered() { return this.rows.filter(appointment => !this.filter || appointment.status === this.filter); }
  ngOnInit() { this.load(); }
  load() {
    this.loading = true;
    this.api.get<Appointment[]>('/appointments').subscribe({
      next: rows => { this.rows = rows; this.loading = false; },
      error: e => { this.error = message(e); this.loading = false; }
    });
  }
  change(appointment: Appointment, status: string) {
    this.busy = true;
    this.error = '';
    this.api.patch('/appointments/' + appointment.id, { status }).subscribe({
      next: () => { this.busy = false; this.pending = undefined; this.success = 'Cita actualizada correctamente.'; this.load(); },
      error: e => { this.busy = false; this.pending = undefined; this.error = message(e); }
    });
  }
  upcoming(appointment: Appointment) { return appointment.status === 'RESERVADA' && new Date(appointment.starts_at).getTime() > Date.now(); }
  download(appointment: Appointment) { downloadReceipt(appointment); this.success = 'Comprobante PDF generado. Revisa las descargas de tu navegador.'; }
  calendar(appointment: Appointment) { if (this.upcoming(appointment)) { downloadCalendar(appointment); this.success = 'Archivo de calendario generado. Ábrelo en tu calendario para agregar la cita.'; } }
  print(appointment: Appointment) {
    this.printId = appointment.id;
    document.body.classList.add('printing-appointment');
    setTimeout(() => {
      try { window.print(); }
      finally { document.body.classList.remove('printing-appointment'); this.printId = null; }
    }, 0);
  }
}
