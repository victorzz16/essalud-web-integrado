import { Component,inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule,FormBuilder,Validators } from '@angular/forms';
import { Router,RouterLink } from '@angular/router';
import { Api,Session,message } from './api';
@Component({standalone:true,imports:[CommonModule,ReactiveFormsModule,RouterLink],template:`
<div class="auth auth-refresh"><section class="auth-story">
<a routerLink="/login" class="brand"><img class="brand-logo" src="/images/clinic-logo.svg" alt=""><span>Mi Salud<small>CITAS MÉDICAS</small></span></a>
<div class="auth-story-copy"><span class="eyebrow light">CERCA DE TI Y DE TU FAMILIA</span><h1>Tu salud.<br>Tu tranquilidad.<br>Un solo lugar.</h1><p>Encuentra tu próximo horario y dedica más tiempo a lo que importa.</p><div class="auth-pills"><span>✓ Reserva sencilla</span><span>✓ Atención organizada</span></div></div>
<div class="family-background" aria-hidden="true"></div>
</section><section class="auth-form"><div class="form-wrap">
<h2>{{register?'Crear cuenta nueva':'Te damos la bienvenida'}}</h2><p class="muted auth-intro">{{register?'Únete a tu espacio de atención y organiza tus citas.':'Inicia sesión para continuar con tu atención.'}}</p>
@if(register){<p class="account-prompt">¿Cómo vas a usar Mi Salud?</p><div class="account-options"><button type="button" class="account-card" [class.chosen]="account==='patient'" [attr.aria-pressed]="account==='patient'" (click)="account='patient'"><span class="account-symbol">♡</span><strong>Soy paciente</strong><span>Reservar citas y consultar mi historial.</span></button><button type="button" class="account-card" [class.chosen]="account==='professional'" [attr.aria-pressed]="account==='professional'" (click)="account='professional'"><span class="account-symbol">✚</span><strong>Soy profesional de la salud</strong><span>Consultar mi agenda y registrar atenciones.</span></button></div>}
@if(error){<div class="alert error" role="alert">{{error}}</div>}@if(success){<div class="alert success" role="status">{{success}}</div>}
@if(register&&account==='professional'){<div class="professional-info"><h3>Acceso para profesionales</h3><p>El administrador crea y habilita tu cuenta profesional. Solicita tus credenciales para acceder a la agenda.</p><a class="primary full" routerLink="/login">Ya tengo cuenta · Iniciar sesión</a></div>}@else{
<form [formGroup]="form" (ngSubmit)="submit()">
@if(register){<label>Nombre completo<input formControlName="name" autocomplete="name" required minlength="2" maxlength="100" placeholder="Juan Pérez García"><small class="muted">Entre 2 y 100 caracteres. No uses números.</small></label><label>DNI<input formControlName="dni" maxlength="8" minlength="8" inputmode="numeric" pattern="[0-9]{8}" required placeholder="Ingresa los 8 dígitos"><small class="muted">Debe tener 8 dígitos y no estar registrado en otra cuenta.</small></label>}
<label>Correo electrónico<input type="email" formControlName="email" autocomplete="username" maxlength="150" required placeholder="tu@correo.pe"></label>
<label>Contraseña<div class="password-field"><input [type]="showPassword?'text':'password'" formControlName="password" [attr.autocomplete]="register?'new-password':'current-password'" minlength="8" [attr.maxlength]="register?64:null" required placeholder="Mínimo 8 caracteres"><button type="button" (click)="showPassword=!showPassword" [attr.aria-label]="showPassword?'Ocultar contraseña':'Mostrar contraseña'">{{showPassword?'Ocultar':'Mostrar'}}</button></div></label>
@if(register){<label>Confirmar contraseña<input [type]="showPassword?'text':'password'" formControlName="confirmPassword" autocomplete="new-password" minlength="8" maxlength="64" required placeholder="Repite tu contraseña"></label><div class="registration-note">ⓘ Tu cuenta te permitirá reservar citas y descargar tus comprobantes. Para probar el sistema, utiliza datos ficticios.</div>}
<button class="primary full" [disabled]="busy">{{busy?'Procesando…':register?'Crear cuenta':'Iniciar sesión'}}</button>
</form>}
<p class="center auth-switch">{{register?'¿Ya tienes cuenta?':'¿Aún no tienes cuenta?'}} <a [routerLink]="register?'/login':'/registro'">{{register?'Inicia sesión':'Crear cuenta'}}</a></p>
</div></section></div>`})
export class Login {
api=inject(Api);router=inject(Router);fb=inject(FormBuilder);busy=false;error='';success='';showPassword=false;account='patient';
get register(){return this.router.url==='/registro'}
form=this.fb.nonNullable.group({
  name:['',[Validators.maxLength(100)]],
  dni:['',[Validators.pattern(/^[0-9]{8}$/)]],
  email:['',[Validators.required,Validators.email,Validators.maxLength(150)]],
  password:['',[Validators.required,Validators.minLength(8)]],
  confirmPassword:['']
});
private validName(value:string){return /^[\p{L}][\p{L}\p{M} .'-]{1,99}$/u.test(value)}
private validEmail(value:string){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)}
submit(){
if(this.busy)return;
this.error='';
const v=this.form.getRawValue();
const email=v.email.trim().toLowerCase();
const name=v.name.trim().replace(/\s+/g,' ');
if(!this.validEmail(email)||email.length>150){this.error='Ingresa un correo electrónico válido de máximo 150 caracteres.';return}
if(v.password.length<8||(this.register&&v.password.length>64)||!v.password.trim()){this.error=this.register?'La contraseña debe tener entre 8 y 64 caracteres.':'Ingresa tu contraseña.';return}
if(this.register){
  if(name.length<2||name.length>100||!this.validName(name)){this.error='Escribe tus nombres y apellidos. Usa entre 2 y 100 caracteres, sin números.';return}
  if(!/^\d{8}$/.test(v.dni.trim())){this.error='El DNI debe contener exactamente 8 dígitos numéricos.';return}
  if(v.password!==v.confirmPassword){this.error='Las contraseñas no coinciden. Revísalas e intenta nuevamente.';return}
}
this.busy=true;
if(this.register)this.api.post('/auth/register',{name,dni:v.dni.trim(),email,password:v.password}).subscribe({next:()=>{this.busy=false;this.success='Cuenta creada. Ya puedes iniciar sesión.';this.router.navigateByUrl('/login')},error:e=>{this.busy=false;this.error=message(e)}});
else this.api.post<Session>('/auth/login',{email,password:v.password}).subscribe({next:s=>{this.api.session.set(s);this.router.navigateByUrl('/inicio');this.busy=false},error:e=>{this.busy=false;this.error=message(e)}});
}}
