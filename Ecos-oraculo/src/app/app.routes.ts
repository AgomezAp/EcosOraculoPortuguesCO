import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'bem-vindo',
    pathMatch: 'full',
  },

  {
    path: 'bem-vindo',
    loadComponent: () =>
      import('./components/bienvenida/bienvenida.component').then(
        (m) => m.BienvenidaComponent
      ),
  },

  {
    path: 'significado-sonhos',
    loadComponent: () =>
      import(
        './components/significado-suenos/significado-suenos.component'
      ).then((m) => m.SignificadoSuenosComponent),
  },

  {
    path: 'informacao-zodiaco',
    loadComponent: () =>
      import(
        './components/informacion-zodiaco/informacion-zodiaco.component'
      ).then((m) => m.InformacionZodiacoComponent),
  },

  {
    path: 'leitura-numerologia',
    loadComponent: () =>
      import(
        './components/lectura-numerologia/lectura-numerologia.component'
      ).then((m) => m.LecturaNumerologiaComponent),
  },

  {
    path: 'mapa-vocacional',
    loadComponent: () =>
      import('./components/mapa-vocacional/mapa-vocacional.component').then(
        (m) => m.MapaVocacionalComponent
      ),
  },

  {
    path: 'animal-interior',
    loadComponent: () =>
      import('./components/animal-interior/animal-interior.component').then(
        (m) => m.AnimalInteriorComponent
      ),
  },

  {
    path: 'tabela-nascimento',
    loadComponent: () =>
      import('./components/tabla-nacimiento/tabla-nacimiento.component').then(
        (m) => m.TablaNacimientoComponent
      ),
  },

  {
    path: 'horoscopo',
    loadComponent: () =>
      import('./components/zodiaco-chino/zodiaco-chino.component').then(
        (m) => m.ZodiacoChinoComponent
      ),
  },

  {
    path: 'calculadora-amor',
    loadComponent: () =>
      import('./components/calculadora-amor/calculadora-amor.component').then(
        (m) => m.CalculadoraAmorComponent
      ),
  },

  {
    path: 'termos-condicoes-ecos',
    loadComponent: () =>
      import(
        './components/terminos-condiciones/terminos-condiciones.component'
      ).then((m) => m.TerminosCondicionesEcos),
  },

  {
    path: 'politicas-cookies',
    loadComponent: () =>
      import('./components/cookies/cookies.component').then(
        (m) => m.CookiesComponent
      ),
  },
];
