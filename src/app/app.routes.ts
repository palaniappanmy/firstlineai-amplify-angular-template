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
	path: 'physician-review',
	loadComponent: () =>
	  import('./pages/physician-review/physician-review.component').then(
		(m) => m.PhysicianReviewComponent
	  )
  },
  {
	path: 'payer-review',
	loadComponent: () =>
	  import('./pages/payer-review/payer-review.component').then(
		(m) => m.PayerReviewComponent
	  )
  },
  {
	path: 'history-insights',
	loadComponent: () =>
	  import('./pages/history-insights/history-insights.component').then(
		(m) => m.HistoryInsightsComponent
	  )
  },
  {
	path: '**',
	redirectTo: 'appointment-booking'
  }
];
