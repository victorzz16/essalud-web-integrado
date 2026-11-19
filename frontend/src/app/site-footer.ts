import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from './api';
@Component({selector:'app-site-footer',standalone:true,imports:[RouterLink],template:`
<footer class="site-footer">
<div class="footer-grid">
<div class="footer-brand"><a routerLink="/inicio" class="brand"><img class="brand-logo" src="/images/clinic-logo.svg" alt=""><span>Mi Salud<small>CITAS MÉDICAS</small></span></a><p>Tu atención, mejor organizada.<br>Reserva y consulta tus citas desde un solo lugar.</p></div>
<div><h3>Pacientes</h3><a routerLink="/reservar">Buscar médicos y especialidades</a><a routerLink="/reservar">Reservar una cita</a><a routerLink="/mis-citas">Consultar mis citas</a>@if(api.session()?.role==='PACIENTE'){<a routerLink="/calendario">Ver calendario</a>}</div>
<div><h3>Profesionales</h3><a [routerLink]="api.session()?.role==='MEDICO'?'/agenda':'/login'">Acceso a la agenda</a><p>Las cuentas profesionales son habilitadas por el administrador.</p></div>
<div><h3>Tu cuenta</h3>@if(!api.session()){<a routerLink="/registro">Crear cuenta</a><a routerLink="/login">Iniciar sesión</a>}@else{<a routerLink="/inicio">Mi espacio de salud</a><a routerLink="/perfil">Editar mi perfil</a>}<details><summary>Ayuda con el acceso</summary><p>Usa tu correo y contraseña registrados. Si no puedes ingresar, contacta al administrador del sistema.</p></details></div>
</div><div class="footer-bottom"><span>© {{year}} Mi Salud</span><span>Horarios de Perú · UTC−5 <span class="footer-dot">●</span> Hecho en Perú</span></div>
</footer>`})
export class SiteFooter {api=inject(Api);year=new Date().getFullYear()}
