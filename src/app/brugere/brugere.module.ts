import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { BrugereListComponent } from '../brugere-list/brugere-list.component';

const routes: Routes = [
  { path: '', component: BrugereListComponent }
 ];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class BrugereModule { }
