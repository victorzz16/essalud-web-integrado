import { SiteFooter } from './site-footer';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, Routes, CanActivateFn } from '@angular/router';
import { Api } from './api';
import { Login } from './login';
import { Dashboard, Booking, Appointments } from './patient';
import { CalendarPage } from './calendar';
import { ProfilePage } from './profile';
import { Admin } from './admin';

const guard: CanActivateFn = route => {
  const api = inject(Api), router = inject(Router), session = api.session();
  return session ? (route.data['roles']?.includes(session.role) ? true : router.parseUrl('/inicio')) : router.parseUrl('/login');
};

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'registro', component: Login },
  { path: 'inicio', component: Dashboard, canActivate: [guard], data: { roles: ['PACIENTE','MEDICO','ADMIN'] } },
  { path: 'reservar', component: Booking, canActivate: [guard], data: { roles: ['PACIENTE'] } },
  { path: 'mis-citas', component: Appointments, canActivate: [guard], data: { roles: ['PACIENTE'] } },
  { path: 'calendario', component: CalendarPage, canActivate: [guard], data: { roles: ['PACIENTE'] } },
  { path: 'perfil', component: ProfilePage, canActivate: [guard], data: { roles: ['PACIENTE','MEDICO','ADMIN'] } },
  { path: 'agenda', component: Appointments, canActivate: [guard], data: { roles: ['MEDICO'] } },
  { path: 'admin', component: Admin, canActivate: [guard], data: { roles: ['ADMIN'] } },
  { path: '**', redirectTo: 'inicio' }
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, SiteFooter],
  template: `
    @if(api.session(); as user){
      <div class="layout">
        <aside>
          <a routerLink="/inicio" class="brand"><img class="brand-logo" src="/images/clinic-logo.svg" alt=""><span>Mi Salud<small>CITAS MÉDICAS</small></span></a>
          <div class="nav-label">MI ESPACIO</div>
          <nav>
            <a routerLink="/inicio" routerLinkActive="active">◫ <span>Inicio</span></a>
            @if(user.role==='PACIENTE'){
              <a routerLink="/reservar" routerLinkActive="active">＋ <span>Reservar cita</span></a>
              <a routerLink="/mis-citas" routerLinkActive="active">▦ <span>Mis citas</span></a>
              <a routerLink="/calendario" routerLinkActive="active">▤ <span>Calendario</span></a>
            }
            @if(user.role==='MEDICO'){<a routerLink="/agenda" routerLinkActive="active">▦ <span>Mi agenda</span></a>}
            @if(user.role==='ADMIN'){<a routerLink="/admin" routerLinkActive="active">⚙ <span>Administración</span></a>}
            <a routerLink="/perfil" routerLinkActive="active">◎ <span>Mi perfil</span></a>
          </nav>
          <div class="aside-bottom">
            <div class="demo-note">ENTORNO ACADÉMICO<br><strong>EsSalud · Datos de demostración</strong><p>No conectado a servicios oficiales.</p></div>
            <button class="logout" (click)="logout()">↪ Cerrar sesión</button>
          </div>
        </aside>
        <div class="workspace">
          <header>
            <span>Portal de atención <b>/</b> Consulta externa</span>
            <a routerLink="/perfil" class="user user-profile-link">
              @if(user.photo_data){<img class="avatar user-photo" [src]="user.photo_data" alt="Fotografía de perfil">}
              @else{<span class="avatar">{{user.name.slice(0,1)}}</span>}
              <div>{{user.name}}<small>{{user.role}}</small></div>
            </a>
          </header>
          <main><router-outlet/></main>
          <app-site-footer/>
        </div>
      </div>
    } @else {
      <router-outlet/><app-site-footer/>
    }
  `
})
export class App {
  api = inject(Api);
  router = inject(Router);
  logout() { this.api.logout(); this.router.navigateByUrl('/login'); }
}
