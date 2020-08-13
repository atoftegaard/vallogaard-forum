import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { DokumenterListComponent } from '../dokumenter-list/dokumenter-list.component';
import { NgxFilesizeModule } from 'ngx-filesize';

const routes: Routes = [
  { path: '', component: DokumenterListComponent }
 ];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    NgxFilesizeModule,
    RouterModule.forChild(routes)
  ]
})

export class DokumenterModule { }
