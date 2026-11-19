import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export interface Session {
  token: string;
  name: string;
  role: string;
  photo_data?: string | null;
}
export interface Profile {
  id: number;
  name: string;
  dni: string;
  email: string;
  role: string;
  facility: string;
  facility_code: string;
  coverage: string;
  coverage_until: string;
  photo_data?: string | null;
}
export interface Doctor {
  id: number;
  name: string;
  email?: string;
  specialty: string;
  specialty_id: number;
  active: boolean;
  facility: string;
  facility_code: string;
  available_slots?: number;
  next_available?: string | null;
}
export interface Facility {
  code: string;
  name: string;
  region: string;
  district: string;
  address?: string;
}
export interface Slot {
  id: number; doctor_id?: number; starts_at: string; ends_at: string; blocked?: boolean; block_reason?: string | null;
  range_blocked?: boolean; range_block_reason?: string | null; doctor?: string; specialty?: string; facility?: string;
  appointment_status?: string; patient?: string | null;
}
export interface ScheduleBlock {
  id: number; doctor_id: number; doctor: string; starts_at: string; ends_at: string; reason: string; active: boolean;
}
export interface Appointment {
  id: number;
  status: string;
  starts_at: string;
  ends_at: string;
  doctor: string;
  patient: string;
  specialty: string;
  facility: string;
}
export interface Specialty { id: number; name: string; active: boolean; direct: boolean }

@Injectable({ providedIn: 'root' })
export class Api {
  http = inject(HttpClient);
  session = signal<Session | null>(null);
  get<T>(path: string) { return this.http.get<T>('/api' + path); }
  post<T>(path: string, body: unknown) { return this.http.post<T>('/api' + path, body); }
  patch<T>(path: string, body: unknown) { return this.http.patch<T>('/api' + path, body); }
  put<T>(path: string, body: unknown) { return this.http.put<T>('/api' + path, body); }
  logout() { this.session.set(null); }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const api = inject(Api), router = inject(Router), session = api.session();
  return next(session && req.url.startsWith('/api/')
    ? req.clone({ setHeaders: { Authorization: 'Bearer ' + session.token } })
    : req).pipe(catchError(error => {
      if (error.status === 401 && !req.url.includes('/auth/')) {
        api.logout();
        router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }));
};

export function message(error: any): string {
  return error.error?.message || (error.status === 0
    ? 'No se pudo conectar con el servidor. Verifica que el backend esté encendido.'
    : error.status === 403
      ? 'No tienes permiso para esta operación.'
      : error.status === 409
        ? 'No se pudo guardar porque existe un conflicto con los datos registrados.'
        : 'No se pudo completar la operación. Consulta tus citas antes de repetir una reserva.');
}
