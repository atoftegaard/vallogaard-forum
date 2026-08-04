import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { MedlemmerListComponent } from '../medlemmer-list/medlemmer-list.component';
import { AuthGuard } from '../core';

const routes: Routes = [
  { path: '', component: MedlemmerListComponent, canActivate: [AuthGuard] }
 ];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class MedlemmerModule { }
