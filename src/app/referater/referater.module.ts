import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { ReferaterListComponent } from '../referater-list/referater-list.component';

const routes: Routes = [
  { path: '', component: ReferaterListComponent }
 ];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class ReferaterModule { }
