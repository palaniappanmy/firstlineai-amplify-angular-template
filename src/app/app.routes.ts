import { Routes } from '@angular/router';

export const routes: Routes = [
  {
	path: '',
	pathMatch: 'full',
	redirectTo: 'appointment-booking'
  },
  {
	path: 'appointment-booking',
	loadComponent: () =>
	  import('./pages/appointment-booking/appointment-booking.component').then(
		(m) => m.AppointmentBookingComponent
	  )
  },
  {
	path: '**',
	redirectTo: 'appointment-booking'
  }
];
