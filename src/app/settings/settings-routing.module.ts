import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../core';
import { SettingsComponent } from './settings.component';
import { ResolveConfig } from 'ngx-typed-router';
import { SettingsResolver } from './settings-resolver.service';
import { SettingsRouteData } from './settings-route-data';

const routes: Routes = [
  {
    path: '',
    component: SettingsComponent,
    canActivate: [AuthGuard],
    resolve: {
      profile: SettingsResolver
    } as ResolveConfig<SettingsRouteData>
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [
    SettingsResolver
  ]
})
export class SettingsRoutingModule {}
