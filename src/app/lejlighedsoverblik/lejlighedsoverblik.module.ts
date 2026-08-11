import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { LejlighedsoverblikListComponent } from '../lejlighedsoverblik-list/lejlighedsoverblik-list.component';
import { AuthGuard } from '../core';

const routes: Routes = [
  { path: '', component: LejlighedsoverblikListComponent, canActivate: [AuthGuard] }
 ];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class LejlighedsoverblikModule { }
