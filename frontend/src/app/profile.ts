import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api, Profile, message } from './api';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-heading">
      <div><span class="eyebrow">TU CUENTA</span><h1>Mi perfil</h1><p class="muted">Actualiza tu fotografía y mantén tus datos de contacto al día.</p></div>
      <span class="tag">Información personal</span>
    </div>
    @if (error) { <div class="alert error" role="alert">{{error}}</div> }
    @if (success) { <div class="alert success" role="status">{{success}}</div> }
    @if (loading) {
      <section class="panel empty"><span>◉</span><p>Cargando tu perfil…</p></section>
    } @else if (profile) {
      <div class="profile-layout">
        <section class="panel profile-photo-panel">
          <div class="profile-photo-large">
            @if (photoPreview) { <img [src]="photoPreview" alt="Fotografía de perfil"> }
            @else { <span>{{name.trim().slice(0,1).toUpperCase() || 'U'}}</span> }
          </div>
          <h2>{{name || profile.name}}</h2>
          <p class="muted">{{profile.role}}</p>
          <label class="upload-photo-button">
            <input type="file" accept="image/png,image/jpeg,image/webp" (change)="onPhoto($event)">
            <span>＋ Cambiar fotografía</span>
          </label>
          @if (photoPreview) { <button class="text-button" type="button" (click)="removePhoto()">Quitar fotografía</button> }
          <small class="muted photo-hint">JPG, PNG o WebP. La imagen se ajusta automáticamente para el perfil.</small>
        </section>
        <section class="panel profile-form-panel">
          <div class="profile-section-title"><div><span class="eyebrow">DATOS DE LA CUENTA</span><h2>Información personal</h2></div></div>
          <form (ngSubmit)="save()">
            <div class="profile-form-grid">
              <label>Nombre completo<input name="name" [(ngModel)]="name" required minlength="2" maxlength="100" autocomplete="name"><small class="muted">Entre 2 y 100 caracteres; solo letras, espacios, apóstrofes, puntos o guiones.</small></label>
              <label>Correo electrónico<input name="email" type="email" [(ngModel)]="email" required maxlength="150" autocomplete="email"><small class="muted">No puede estar registrado en otra cuenta.</small></label>
              <label>DNI<input [value]="profile.dni" disabled></label>
              <label>Tipo de cuenta<input [value]="profile.role" disabled></label>
              <label class="profile-wide">Sede de referencia<input [value]="profile.facility" disabled></label>
            </div>
            <div class="profile-coverage">
              <div><small>ESTADO DE COBERTURA DEMO</small><strong>{{profile.coverage}}</strong></div>
              <div><small>VIGENCIA REGISTRADA</small><strong>{{profile.coverage_until | date:'dd/MM/yyyy'}}</strong></div>
            </div>
            <p class="hint">Este proyecto es una demostración académica. Los datos de cobertura y sede no consultan ni modifican los sistemas oficiales de EsSalud.</p>
            <div class="profile-actions"><button class="primary" type="submit" [disabled]="saving">{{saving?'Guardando…':'Guardar cambios'}}</button></div>
          </form>
        </section>
      </div>
    }
  `
})
export class ProfilePage implements OnInit {
  api = inject(Api);
  profile?: Profile;
  name = '';
  email = '';
  photoData: string | null = null;
  photoPreview = '';
  loading = true;
  saving = false;
  error = '';
  success = '';

  ngOnInit() {
    this.api.get<Profile>('/me').subscribe({
      next: profile => {
        this.profile = profile;
        this.name = profile.name;
        this.email = profile.email;
        this.photoData = profile.photo_data || null;
        this.photoPreview = this.photoData || '';
        this.loading = false;
      },
      error: e => { this.error = message(e); this.loading = false; }
    });
  }

  onPhoto(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.error = 'Selecciona una imagen JPG, PNG o WebP.';
      input.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      this.error = 'La fotografía debe pesar menos de 8 MB.';
      input.value = '';
      return;
    }
    this.error = '';
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSize = 512;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          this.error = 'No se pudo procesar la fotografía en este navegador.';
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        let compressed = canvas.toDataURL('image/jpeg', 0.68);
        if (compressed.length > 340000) compressed = canvas.toDataURL('image/jpeg', 0.48);
        if (compressed.length > 350000) {
          this.error = 'La fotografía no pudo reducirse lo suficiente. Prueba con otra imagen.';
          return;
        }
        this.photoData = compressed;
        this.photoPreview = compressed;
      };
      image.onerror = () => this.error = 'No se pudo abrir la imagen seleccionada.';
      image.src = String(reader.result);
    };
    reader.onerror = () => this.error = 'No se pudo leer el archivo seleccionado.';
    reader.readAsDataURL(file);
    input.value = '';
  }

  removePhoto() {
    this.photoData = null;
    this.photoPreview = '';
  }

  save() {
    if (this.saving || !this.profile) return;
    this.error = '';
    this.success = '';
    const cleanName = this.name.trim().replace(/\s+/g, ' ');
    const cleanEmail = this.email.trim().toLowerCase();
    if (cleanName.length < 2 || cleanName.length > 100 || !/^[\p{L}][\p{L}\p{M} .'-]{1,99}$/u.test(cleanName)) {
      this.error = 'El nombre debe tener entre 2 y 100 caracteres y no contener números.';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail) || cleanEmail.length > 150) {
      this.error = 'Ingresa un correo electrónico válido de máximo 150 caracteres.';
      return;
    }
    this.saving = true;
    this.api.put<Profile>('/me', {
      name: cleanName,
      email: cleanEmail,
      photoData: this.photoData
    }).subscribe({
      next: profile => {
        this.profile = profile;
        this.name = profile.name;
        this.email = profile.email;
        this.photoData = profile.photo_data || null;
        this.photoPreview = this.photoData || '';
        const session = this.api.session();
        if (session) this.api.session.set({ ...session, name: profile.name, photo_data: profile.photo_data || null });
        this.success = 'Tu perfil se actualizó correctamente.';
        this.saving = false;
      },
      error: e => { this.error = message(e); this.saving = false; }
    });
  }
}
